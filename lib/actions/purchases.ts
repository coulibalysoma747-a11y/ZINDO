"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generatePurchaseNumber } from "@/lib/reference";
import { adjustStock } from "@/lib/stock";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";

export type PurchaseItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type CreatePurchaseInput = {
  supplierId: string;
  locationId: string;
  items: PurchaseItemInput[];
  amountPaid: number;
  /** Frais de transport payés pour cet achat (coût rendu boutique, voir lib/restock-engine.ts). */
  transportCost?: number;
  note?: string;
  /** Clé d'idempotence pour un achat enregistré hors ligne (voir lib/offline/) — absente pour un achat créé normalement en ligne. */
  clientRef?: string;
};

export type CreatePurchaseResult =
  | { success: true; purchaseId: string }
  | { success: false; error: string };

export async function createPurchaseAction(input: CreatePurchaseInput): Promise<CreatePurchaseResult> {
  try {
    return await createPurchaseImpl(input);
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[createPurchaseAction] Erreur inattendue :", e);
    return { success: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

async function createPurchaseImpl(input: CreatePurchaseInput): Promise<CreatePurchaseResult> {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);

  if (input.clientRef) {
    const { data: existing } = await supabase
      .from("purchases")
      .select("id")
      .eq("business_id", user.businessId)
      .eq("client_ref", input.clientRef)
      .maybeSingle();
    if (existing) return { success: true, purchaseId: existing.id as string };
  }

  if (!input.supplierId) return { success: false, error: "Sélectionnez un fournisseur" };
  if (!input.locationId) return { success: false, error: "Sélectionnez la boutique de destination" };
  if (!input.items || input.items.length === 0) return { success: false, error: "Ajoutez au moins un produit" };
  for (const item of input.items) {
    if (item.quantity <= 0) return { success: false, error: "Quantité invalide" };
    if (item.unitPrice < 0) return { success: false, error: "Prix invalide" };
  }

  const [{ data: supplier }, { data: location }] = await Promise.all([
    supabase.from("suppliers").select("id").eq("id", input.supplierId).eq("business_id", user.businessId).maybeSingle(),
    supabase.from("locations").select("id").eq("id", input.locationId).eq("business_id", user.businessId).maybeSingle(),
  ]);
  if (!supplier) return { success: false, error: "Fournisseur introuvable" };
  if (!location) return { success: false, error: "Boutique introuvable" };

  const productIds = input.items.map((i) => i.productId);
  const { data: products } = await supabase.from("products").select("id").in("id", productIds).eq("business_id", user.businessId);
  const productIdSet = new Set((products ?? []).map((p) => p.id as string));
  for (const item of input.items) {
    if (!productIdSet.has(item.productId)) return { success: false, error: "Un produit est introuvable" };
  }

  const total = input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const amountPaid = Math.max(0, Math.min(input.amountPaid, total));
  const status = amountPaid >= total ? "RECUE" : amountPaid > 0 ? "PARTIELLE" : "COMMANDEE";
  const number = await generatePurchaseNumber(user.businessId);

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      business_id: user.businessId,
      location_id: input.locationId,
      number,
      supplier_id: input.supplierId,
      user_id: user.id,
      total,
      amount_paid: amountPaid,
      status,
      // Colonne ajoutée par 2026-09-25_bons_de_commande_parrainage.sql : envoyée
      // seulement quand elle est renseignée, pour ne pas casser l'enregistrement
      // d'un achat classique tant que la migration n'est pas appliquée.
      ...(input.transportCost && input.transportCost > 0 ? { transport_cost: input.transportCost } : {}),
      note: input.note ?? null,
      client_ref: input.clientRef ?? null,
    })
    .select("id")
    .single();
  if (purchaseError || !purchase) {
    console.error("[createPurchaseAction] Échec de la création :", purchaseError?.message);
    return { success: false, error: "Impossible d'enregistrer l'achat" };
  }

  const { error: itemsError } = await supabase.from("purchase_items").insert(
    input.items.map((i) => ({
      purchase_id: purchase.id,
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      total: i.quantity * i.unitPrice,
    }))
  );
  if (itemsError) {
    console.error("[createPurchaseAction] Échec de l'enregistrement des articles :", itemsError.message);
    return { success: false, error: "Impossible d'enregistrer les articles de l'achat" };
  }

  // En parallèle plutôt qu'un for-loop séquentiel (3 appels réseau par
  // article) : chaque article touche des lignes différentes, rien ne les
  // empêche de partir en même temps — évite d'approcher le délai maximum
  // d'une fonction Vercel sur un gros bon de livraison.
  await Promise.all(
    input.items.map(async (item) => {
      const { error: priceError } = await supabase
        .from("products")
        .update({ purchase_price: item.unitPrice })
        .eq("id", item.productId);
      if (priceError) console.error("[createPurchaseAction] Échec de la mise à jour du prix d'achat :", priceError.message);

      const { oldStock, newStock } = await adjustStock({
        productId: item.productId,
        locationId: input.locationId,
        delta: item.quantity,
      });

      const { error: movementError } = await supabase.from("stock_movements").insert({
        business_id: user.businessId,
        location_id: input.locationId,
        product_id: item.productId,
        direction: "IN",
        reason: "ACHAT",
        quantity: item.quantity,
        old_stock: oldStock,
        new_stock: newStock,
        user_id: user.id,
        note: `Achat ${number}`,
      });
      if (movementError) console.error("[createPurchaseAction] Échec de l'écriture du mouvement de stock :", movementError.message);
    })
  );

  if (amountPaid > 0) {
    const { error: paymentError } = await supabase.from("supplier_payments").insert({
      supplier_id: input.supplierId,
      purchase_id: purchase.id,
      amount: amountPaid,
      method: "ESPECES",
      user_id: user.id,
    });
    if (paymentError) console.error("[createPurchaseAction] Échec de l'enregistrement du paiement :", paymentError.message);
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Purchase",
    entityId: purchase.id as string,
    details: `Total ${total}`,
  });

  revalidatePath("/achats");
  revalidatePath("/produits");
  revalidatePath(`/fournisseurs/${input.supplierId}`);
  revalidatePath("/dashboard");

  return { success: true, purchaseId: purchase.id as string };
}

/**
 * Supprimer un achat saisi par erreur (flag modifier_supprimer_partout).
 * Le stock ajouté est retiré (mouvement « CORRECTION » tracé dans
 * l'historique), le paiement au fournisseur lié est effacé. Refusé si une
 * partie de la marchandise est déjà sortie du stock, ou si l'achat provient
 * de la réception d'un bon de commande.
 */
export async function deletePurchaseAction(purchaseId: string) {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, number, supplierId:supplier_id, locationId:location_id, items:purchase_items(productId:product_id, quantity)")
    .eq("id", purchaseId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!purchase) return { error: "Achat introuvable" };
  const number = purchase.number as string;
  const locationId = purchase.locationId as string;
  const items = (purchase.items ?? []) as unknown as Array<{ productId: string; quantity: number }>;

  const { data: linkedOrder, error: orderError } = await supabase
    .from("purchase_orders")
    .select("id")
    .eq("purchase_id", purchaseId)
    .limit(1)
    .maybeSingle();
  if (!orderError && linkedOrder) {
    return { error: "Cet achat vient de la réception d'un bon de commande : il ne peut pas être supprimé" };
  }

  // Quantité à retirer par produit (un produit peut figurer sur plusieurs lignes).
  const toRemove = new Map<string, number>();
  for (const i of items) toRemove.set(i.productId, (toRemove.get(i.productId) ?? 0) + i.quantity);
  const productIds = [...toRemove.keys()];

  if (productIds.length > 0) {
    const [{ data: stocks }, { data: products }] = await Promise.all([
      supabase.from("product_stocks").select("productId:product_id, quantity").eq("location_id", locationId).in("product_id", productIds),
      supabase.from("products").select("id, name").in("id", productIds),
    ]);
    const stockOf = new Map(((stocks ?? []) as Array<{ productId: string; quantity: number }>).map((s) => [s.productId, s.quantity]));
    const nameOf = new Map(((products ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]));
    const short = productIds.filter((id) => (stockOf.get(id) ?? 0) < (toRemove.get(id) ?? 0));
    if (short.length > 0) {
      return {
        error: `Impossible : une partie de la marchandise est déjà sortie du stock (${short
          .map((id) => nameOf.get(id) ?? "produit")
          .join(", ")}). Faites plutôt une sortie de stock « Retour fournisseur ».`,
      };
    }
  }

  for (const [productId, quantity] of toRemove) {
    const { oldStock, newStock } = await adjustStock({ productId, locationId, delta: -quantity });
    const { error: movementError } = await supabase.from("stock_movements").insert({
      business_id: user.businessId,
      location_id: locationId,
      product_id: productId,
      direction: "OUT",
      reason: "CORRECTION",
      quantity,
      old_stock: oldStock,
      new_stock: newStock,
      user_id: user.id,
      note: `Suppression de l'achat ${number}`,
    });
    if (movementError) console.error("[deletePurchaseAction] Échec de l'écriture du mouvement de stock :", movementError.message);
  }

  await supabase.from("supplier_payments").delete().eq("purchase_id", purchaseId);
  await supabase.from("purchase_items").delete().eq("purchase_id", purchaseId);
  const { error } = await supabase.from("purchases").delete().eq("id", purchaseId);
  if (error) {
    console.error("[deletePurchaseAction] Échec de la suppression :", error.message);
    return { error: "Le stock a été corrigé, mais l'achat n'a pas pu être supprimé" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "DELETE",
    entity: "Purchase",
    entityId: purchaseId,
    details: `Achat ${number} supprimé, stock retiré`,
  });

  revalidatePath("/achats");
  revalidatePath("/produits");
  revalidatePath("/stock");
  revalidatePath(`/fournisseurs/${purchase.supplierId as string}`);
  revalidatePath("/dashboard");
  return { success: "Achat supprimé" };
}

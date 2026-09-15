"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generatePurchaseNumber } from "@/lib/reference";
import { adjustStock } from "@/lib/stock";

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
  note?: string;
};

export type CreatePurchaseResult =
  | { success: true; purchaseId: string }
  | { success: false; error: string };

export async function createPurchaseAction(input: CreatePurchaseInput): Promise<CreatePurchaseResult> {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);

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
      note: input.note ?? null,
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

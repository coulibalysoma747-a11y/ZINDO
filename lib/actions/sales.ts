"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission, requireUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generateSaleNumber } from "@/lib/reference";
import { adjustStock } from "@/lib/stock";
import type { PaymentMethod } from "@/lib/db-types";

export type CartItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

export type CreateSaleInput = {
  locationId: string;
  items: CartItemInput[];
  customerId?: string;
  discount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  note?: string;
  documentType?: "TICKET" | "FACTURE";
};

export type CreateSaleResult = { success: true; saleId: string } | { success: false; error: string };

/**
 * Enregistre les mouvements de stock (sortie) pour chaque article vendu.
 * Non bloquant en cas d'échec partiel de l'écriture du journal de mouvement
 * (l'ajustement du stock lui-même, via adjustStock, est déjà fait avant) —
 * limite connue de la migration hors transaction Prisma, voir le commit.
 */
async function recordStockMovements(
  items: { productId: string; quantity: number }[],
  params: { businessId: string; locationId: string; userId: string; direction: "IN" | "OUT"; reason: string; note: string }
) {
  // En parallèle plutôt qu'un for-loop séquentiel : chaque article touche une
  // ligne product_stocks différente (adjustStock est atomique par ligne côté
  // base), donc rien n'empêche de lancer les appels en même temps. Pour un
  // panier de plusieurs dizaines d'articles, la version séquentielle pouvait
  // approcher/dépasser le délai maximum d'une fonction Vercel.
  await Promise.all(
    items
      .filter((item) => item.quantity !== 0)
      .map((item) => recordOneStockMovement(item, params))
  );
}

async function recordOneStockMovement(
  item: { productId: string; quantity: number },
  params: { businessId: string; locationId: string; userId: string; direction: "IN" | "OUT"; reason: string; note: string }
) {
  const { oldStock, newStock } = await adjustStock({
    productId: item.productId,
    locationId: params.locationId,
    delta: params.direction === "IN" ? item.quantity : -item.quantity,
  });
  const { error } = await supabase.from("stock_movements").insert({
    business_id: params.businessId,
    location_id: params.locationId,
    product_id: item.productId,
    direction: params.direction,
    reason: params.reason,
    quantity: item.quantity,
    old_stock: oldStock,
    new_stock: newStock,
    user_id: params.userId,
    note: params.note,
  });
  if (error) console.error("[sales] Échec de l'écriture du mouvement de stock :", error.message);
}

export async function createSaleAction(input: CreateSaleInput): Promise<CreateSaleResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  if (!input.locationId) return { success: false, error: "Boutique introuvable" };
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "Le panier est vide" };
  }

  const { data: location } = await supabase
    .from("locations")
    .select("id, name")
    .eq("id", input.locationId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!location) return { success: false, error: "Boutique introuvable" };

  const { data: activeSession } = await supabase
    .from("cash_sessions")
    .select("id")
    .eq("business_id", user.businessId)
    .eq("location_id", input.locationId)
    .eq("status", "OUVERTE")
    .maybeSingle();
  if (!activeSession) {
    return { success: false, error: "Ouvrez une session de caisse avant d'encaisser une vente" };
  }

  const productIds = input.items.map((i) => i.productId);
  const [{ data: products }, { data: stocks }] = await Promise.all([
    supabase.from("products").select("id, name, purchasePrice:purchase_price").in("id", productIds).eq("business_id", user.businessId),
    supabase.from("product_stocks").select("productId:product_id, quantity").in("product_id", productIds).eq("location_id", input.locationId),
  ]);
  const productMap = new Map(
    ((products ?? []) as unknown as Array<{ id: string; name: string; purchasePrice: number }>).map((p) => [p.id, p])
  );
  const stockMap = new Map(((stocks ?? []) as Array<{ productId: string; quantity: number }>).map((s) => [s.productId, s.quantity]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) return { success: false, error: "Un produit du panier est introuvable" };
    if (item.quantity <= 0) return { success: false, error: "Quantité invalide" };
    const available = stockMap.get(item.productId) ?? 0;
    if (available < item.quantity) {
      return {
        success: false,
        error: `Stock insuffisant pour "${product.name}" à ${location.name} (disponible : ${available})`,
      };
    }
  }

  const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity - i.discount, 0);
  const total = Math.max(0, subtotal - input.discount);
  const amountPaid = Math.max(0, input.amountPaid);

  if (amountPaid < total && !input.customerId) {
    return { success: false, error: "Sélectionnez un client pour une vente à crédit ou partielle" };
  }

  const status = amountPaid >= total ? "PAYEE" : amountPaid > 0 ? "PARTIELLE" : "CREDIT";
  const number = await generateSaleNumber(user.businessId);

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      business_id: user.businessId,
      location_id: input.locationId,
      number,
      customer_id: input.customerId || null,
      user_id: user.id,
      subtotal,
      discount: input.discount,
      total,
      amount_paid: amountPaid,
      payment_method: input.paymentMethod,
      status,
      document_type: input.documentType ?? "TICKET",
      note: input.note ?? null,
    })
    .select("id")
    .single();
  if (saleError || !sale) {
    console.error("[createSaleAction] Échec de la création de la vente :", saleError?.message);
    return { success: false, error: "Impossible d'enregistrer la vente" };
  }

  const { error: itemsError } = await supabase.from("sale_items").insert(
    input.items.map((i) => {
      const product = productMap.get(i.productId)!;
      return {
        sale_id: sale.id,
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        unit_cost: product.purchasePrice,
        discount: i.discount,
        total: i.unitPrice * i.quantity - i.discount,
      };
    })
  );
  if (itemsError) {
    console.error("[createSaleAction] Échec de l'enregistrement des articles :", itemsError.message);
    return { success: false, error: "Impossible d'enregistrer les articles de la vente" };
  }

  await recordStockMovements(input.items, {
    businessId: user.businessId,
    locationId: input.locationId,
    userId: user.id,
    direction: "OUT",
    reason: "VENTE",
    note: `Vente ${number}`,
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Sale",
    entityId: sale.id as string,
    details: `Total ${total}`,
  });

  revalidatePath("/ventes");
  revalidatePath("/ventes/historique");
  revalidatePath("/produits");
  revalidatePath("/dashboard");
  if (input.customerId) revalidatePath(`/clients/${input.customerId}`);

  return { success: true, saleId: sale.id as string };
}

export type UpdateSaleInput = {
  saleId: string;
  items: CartItemInput[];
  customerId?: string;
  discount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  note?: string;
};

export async function updateSaleAction(input: UpdateSaleInput): Promise<CreateSaleResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  const { data: sale } = await supabase
    .from("sales")
    .select("id, number, locationId:location_id, customerId:customer_id, status")
    .eq("id", input.saleId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!sale) return { success: false, error: "Vente introuvable" };
  if (sale.status === "ANNULEE") {
    return { success: false, error: "Impossible de modifier une vente annulée" };
  }
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "Le panier est vide" };
  }

  const { data: existingItems } = await supabase
    .from("sale_items")
    .select("productId:product_id, quantity")
    .eq("sale_id", sale.id);
  const oldQtyMap = new Map(((existingItems ?? []) as Array<{ productId: string; quantity: number }>).map((i) => [i.productId, i.quantity]));
  const productIds = Array.from(new Set([...oldQtyMap.keys(), ...input.items.map((i) => i.productId)]));

  const [{ data: products }, { data: stocks }] = await Promise.all([
    supabase.from("products").select("id, name, purchasePrice:purchase_price").in("id", productIds).eq("business_id", user.businessId),
    supabase.from("product_stocks").select("productId:product_id, quantity").in("product_id", productIds).eq("location_id", sale.locationId as string),
  ]);
  const productMap = new Map(
    ((products ?? []) as unknown as Array<{ id: string; name: string; purchasePrice: number }>).map((p) => [p.id, p])
  );
  const currentStockMap = new Map(((stocks ?? []) as Array<{ productId: string; quantity: number }>).map((s) => [s.productId, s.quantity]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) return { success: false, error: "Un produit du panier est introuvable" };
    if (item.quantity <= 0) return { success: false, error: "Quantité invalide" };
    // Le stock déjà réservé par l'ancienne version de cette vente reste disponible pour la nouvelle.
    const available = (currentStockMap.get(item.productId) ?? 0) + (oldQtyMap.get(item.productId) ?? 0);
    if (available < item.quantity) {
      return { success: false, error: `Stock insuffisant pour "${product.name}" (disponible : ${available})` };
    }
  }

  const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity - i.discount, 0);
  const total = Math.max(0, subtotal - input.discount);
  const amountPaid = Math.max(0, input.amountPaid);

  if (amountPaid < total && !input.customerId) {
    return { success: false, error: "Sélectionnez un client pour une vente à crédit ou partielle" };
  }

  const status = amountPaid >= total ? "PAYEE" : amountPaid > 0 ? "PARTIELLE" : "CREDIT";

  const newQtyMap = new Map(input.items.map((i) => [i.productId, i.quantity]));
  const changedProductIds = productIds.filter((productId) => {
    const oldQty = oldQtyMap.get(productId) ?? 0;
    const newQty = newQtyMap.get(productId) ?? 0;
    return oldQty - newQty !== 0;
  });
  // En parallèle (voir recordStockMovements dans createSaleAction pour la même remarque).
  await Promise.all(
    changedProductIds.map(async (productId) => {
      const oldQty = oldQtyMap.get(productId) ?? 0;
      const newQty = newQtyMap.get(productId) ?? 0;
      const delta = oldQty - newQty;
      const { oldStock, newStock } = await adjustStock({ productId, locationId: sale.locationId as string, delta });
      const { error } = await supabase.from("stock_movements").insert({
        business_id: user.businessId,
        location_id: sale.locationId,
        product_id: productId,
        direction: delta > 0 ? "IN" : "OUT",
        reason: "CORRECTION",
        quantity: Math.abs(delta),
        old_stock: oldStock,
        new_stock: newStock,
        user_id: user.id,
        note: `Modification vente ${sale.number}`,
      });
      if (error) console.error("[updateSaleAction] Échec de l'écriture du mouvement de stock :", error.message);
    })
  );

  await supabase.from("sale_items").delete().eq("sale_id", sale.id);
  const { error: updateError } = await supabase
    .from("sales")
    .update({
      customer_id: input.customerId || null,
      subtotal,
      discount: input.discount,
      total,
      amount_paid: amountPaid,
      payment_method: input.paymentMethod,
      status,
      note: input.note ?? null,
    })
    .eq("id", sale.id);
  const { error: itemsError } = await supabase.from("sale_items").insert(
    input.items.map((i) => {
      const product = productMap.get(i.productId)!;
      return {
        sale_id: sale.id,
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        unit_cost: product.purchasePrice,
        discount: i.discount,
        total: i.unitPrice * i.quantity - i.discount,
      };
    })
  );
  if (updateError || itemsError) {
    console.error("[updateSaleAction] Échec de la mise à jour :", updateError?.message, itemsError?.message);
    return { success: false, error: "Impossible de mettre à jour la vente" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "Sale",
    entityId: sale.id as string,
    details: `Total ${total}`,
  });

  revalidatePath("/ventes/historique");
  revalidatePath(`/ventes/${sale.id}`);
  revalidatePath("/produits");
  revalidatePath("/dashboard");
  if (sale.customerId) revalidatePath(`/clients/${sale.customerId}`);
  if (input.customerId && input.customerId !== sale.customerId) revalidatePath(`/clients/${input.customerId}`);

  return { success: true, saleId: sale.id as string };
}

export async function cancelSaleAction(saleId: string) {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const { data: sale } = await supabase
    .from("sales")
    .select("id, number, locationId:location_id, status")
    .eq("id", saleId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!sale) return { error: "Vente introuvable" };
  if (sale.status === "ANNULEE") return { error: "Cette vente est déjà annulée" };

  const { data: items } = await supabase.from("sale_items").select("productId:product_id, quantity").eq("sale_id", sale.id);

  await recordStockMovements((items ?? []) as Array<{ productId: string; quantity: number }>, {
    businessId: user.businessId,
    locationId: sale.locationId as string,
    userId: user.id,
    direction: "IN",
    reason: "RETOUR_CLIENT",
    note: `Annulation vente ${sale.number}`,
  });

  const { error } = await supabase.from("sales").update({ status: "ANNULEE" }).eq("id", sale.id);
  if (error) {
    console.error("[cancelSaleAction] Échec de l'annulation :", error.message);
    return { error: "Impossible d'annuler la vente" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CANCEL",
    entity: "Sale",
    entityId: sale.id as string,
  });

  revalidatePath("/ventes/historique");
  revalidatePath(`/ventes/${sale.id}`);
  revalidatePath("/produits");
  return { success: "Vente annulée, stock réintégré" };
}

export async function getEnabledPaymentMethods() {
  const user = await requireUser();
  const { data: methods } = await supabase
    .from("payment_method_configs")
    .select("method, label")
    .eq("business_id", user.businessId)
    .eq("enabled", true);

  const canonicalOrder: PaymentMethod[] = ["ESPECES", "MOBILE_MONEY", "CARTE", "CREDIT", "AUTRE"];
  const byCanonicalOrder = (a: { method: PaymentMethod }, b: { method: PaymentMethod }) =>
    canonicalOrder.indexOf(a.method) - canonicalOrder.indexOf(b.method);

  if (!methods || methods.length === 0) {
    return [
      { method: "ESPECES" as PaymentMethod, label: "Espèces" },
      { method: "MOBILE_MONEY" as PaymentMethod, label: "Mobile Money" },
      { method: "CARTE" as PaymentMethod, label: "Carte bancaire" },
      { method: "CREDIT" as PaymentMethod, label: "Crédit" },
    ].sort(byCanonicalOrder);
  }
  return (methods as unknown as Array<{ method: PaymentMethod; label: string }>).sort(byCanonicalOrder);
}

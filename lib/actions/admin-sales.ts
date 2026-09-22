"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";
import { logAction } from "@/lib/audit";
import { adjustStock } from "@/lib/stock";
import { recordStockMovements, insertSaleItems, type SaleItemRow } from "@/lib/actions/sales";
import type { PaymentMethod } from "@/lib/db-types";

/**
 * Correction d'une vente depuis la console admin (dépannage d'un commerçant),
 * sans passer par l'usurpation de compte. Réservé au SuperAdmin (comme les
 * autres corrections cross-commerce, ex. resetUserPasswordAction).
 *
 * Contrainte : stock_movements.user_id / audit_logs.user_id référencent un
 * compte User d'un commerce — un SuperAdmin n'en est pas un. On attribue donc
 * ces écritures au vendeur d'origine de la vente (déjà un User valide de ce
 * commerce), avec une note explicite pour que la correction reste traçable
 * dans l'historique du commerçant ; la trace complète (qui, quand) part en
 * plus dans super_admin_audit_logs comme pour les autres actions admin.
 */

export type AdminSaleItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  multiplier?: number;
  packagingUnitId?: string | null;
  unitLabel?: string | null;
};

export type AdminUpdateSaleInput = {
  items: AdminSaleItemInput[];
  discount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  customerId?: string | null;
  note?: string;
};

export type AdminSaleActionResult = { success?: string; error?: string };

async function loadSaleForAdmin(businessId: string, saleId: string) {
  const { data: sale } = await supabase
    .from("sales")
    .select("id, number, locationId:location_id, customerId:customer_id, status, userId:user_id")
    .eq("id", saleId)
    .eq("business_id", businessId)
    .maybeSingle();
  return sale as
    | { id: string; number: string; locationId: string; customerId: string | null; status: string; userId: string }
    | null;
}

export async function adminUpdateSaleAction(
  businessId: string,
  saleId: string,
  input: AdminUpdateSaleInput
): Promise<AdminSaleActionResult> {
  const admin = await requireSuperAdmin();

  const sale = await loadSaleForAdmin(businessId, saleId);
  if (!sale) return { error: "Vente introuvable" };
  if (sale.status === "ANNULEE") return { error: "Impossible de modifier une vente annulée — annulez-en une nouvelle si besoin" };
  if (!input.items || input.items.length === 0) return { error: "Le panier ne peut pas être vide (annulez la vente à la place)" };

  const { data: existingItems } = await supabase
    .from("sale_items")
    .select("productId:product_id, quantity, multiplier")
    .eq("sale_id", sale.id);
  const oldQtyMap = new Map(
    ((existingItems ?? []) as Array<{ productId: string; quantity: number; multiplier: number | null }>).map((i) => [
      i.productId,
      i.quantity * (i.multiplier ?? 1),
    ])
  );
  const productIds = Array.from(new Set([...oldQtyMap.keys(), ...input.items.map((i) => i.productId)]));

  const [{ data: products }, { data: stocks }] = await Promise.all([
    supabase.from("products").select("id, name, purchasePrice:purchase_price").in("id", productIds).eq("business_id", businessId),
    supabase.from("product_stocks").select("productId:product_id, quantity").in("product_id", productIds).eq("location_id", sale.locationId),
  ]);
  const productMap = new Map(
    ((products ?? []) as unknown as Array<{ id: string; name: string; purchasePrice: number }>).map((p) => [p.id, p])
  );
  const currentStockMap = new Map(((stocks ?? []) as Array<{ productId: string; quantity: number }>).map((s) => [s.productId, s.quantity]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) return { error: "Un produit du panier est introuvable" };
    if (item.quantity <= 0) return { error: "Quantité invalide" };
    const available = (currentStockMap.get(item.productId) ?? 0) + (oldQtyMap.get(item.productId) ?? 0);
    const baseUnitsNeeded = item.quantity * (item.multiplier ?? 1);
    if (available < baseUnitsNeeded) {
      return { error: `Stock insuffisant pour "${product.name}" (disponible : ${available})` };
    }
  }

  const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity - i.discount, 0);
  const total = Math.max(0, subtotal - input.discount);
  const amountPaid = Math.max(0, input.amountPaid);
  if (amountPaid < total && !input.customerId && !sale.customerId) {
    return { error: "Sélectionnez un client pour une vente à crédit ou partielle" };
  }
  const status = amountPaid >= total ? "PAYEE" : amountPaid > 0 ? "PARTIELLE" : "CREDIT";

  const newQtyMap = new Map(input.items.map((i) => [i.productId, i.quantity * (i.multiplier ?? 1)]));
  const changedProductIds = productIds.filter((productId) => (oldQtyMap.get(productId) ?? 0) - (newQtyMap.get(productId) ?? 0) !== 0);

  const correctionNote = `[Correction admin plateforme — ${admin.name}] Vente ${sale.number}`;

  await Promise.all(
    changedProductIds.map(async (productId) => {
      const oldQty = oldQtyMap.get(productId) ?? 0;
      const newQty = newQtyMap.get(productId) ?? 0;
      const delta = oldQty - newQty;
      const { oldStock, newStock } = await adjustStock({ productId, locationId: sale.locationId, delta });
      const { error } = await supabase.from("stock_movements").insert({
        business_id: businessId,
        location_id: sale.locationId,
        product_id: productId,
        direction: delta > 0 ? "IN" : "OUT",
        reason: "CORRECTION",
        quantity: Math.abs(delta),
        old_stock: oldStock,
        new_stock: newStock,
        user_id: sale.userId,
        note: correctionNote,
      });
      if (error) console.error("[adminUpdateSaleAction] Échec de l'écriture du mouvement de stock :", error.message);
    })
  );

  await supabase.from("sale_items").delete().eq("sale_id", sale.id);
  const { error: updateError } = await supabase
    .from("sales")
    .update({
      customer_id: input.customerId ?? sale.customerId ?? null,
      subtotal,
      discount: input.discount,
      total,
      amount_paid: amountPaid,
      payment_method: input.paymentMethod,
      status,
      note: input.note ?? null,
    })
    .eq("id", sale.id);

  const itemRows: SaleItemRow[] = input.items.map((i) => {
    const product = productMap.get(i.productId)!;
    return {
      sale_id: sale.id,
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      unit_cost: product.purchasePrice,
      discount: i.discount,
      total: i.unitPrice * i.quantity - i.discount,
      packaging_unit_id: i.packagingUnitId ?? null,
      multiplier: i.multiplier ?? 1,
      unit_label: i.unitLabel ?? null,
    };
  });
  const { error: itemsError } = await insertSaleItems(itemRows);

  if (updateError || itemsError) {
    console.error("[adminUpdateSaleAction] Échec de la mise à jour :", updateError?.message, itemsError?.message);
    return { error: "Impossible de mettre à jour la vente" };
  }

  await logAction({
    businessId,
    userId: sale.userId,
    action: "UPDATE",
    entity: "Sale",
    entityId: sale.id,
    details: `${correctionNote} — nouveau total ${total}`,
  });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "UPDATE",
    entity: "Sale",
    entityId: sale.id,
    details: `Vente ${sale.number} corrigée — nouveau total ${total}`,
  });

  revalidatePath(`/admin/commercants/${businessId}/ventes`);
  revalidatePath(`/admin/commercants/${businessId}/ventes/${sale.id}`);
  revalidatePath("/ventes/historique");
  revalidatePath(`/ventes/${sale.id}`);
  revalidatePath("/produits");
  revalidatePath("/dashboard");

  return { success: "Vente corrigée" };
}

export async function adminCancelSaleAction(businessId: string, saleId: string): Promise<AdminSaleActionResult> {
  const admin = await requireSuperAdmin();

  const sale = await loadSaleForAdmin(businessId, saleId);
  if (!sale) return { error: "Vente introuvable" };
  if (sale.status === "ANNULEE") return { error: "Cette vente est déjà annulée" };

  const { data: items } = await supabase.from("sale_items").select("productId:product_id, quantity").eq("sale_id", sale.id);

  await recordStockMovements((items ?? []) as Array<{ productId: string; quantity: number }>, {
    businessId,
    locationId: sale.locationId,
    userId: sale.userId,
    direction: "IN",
    reason: "RETOUR_CLIENT",
    note: `[Correction admin plateforme — ${admin.name}] Annulation vente ${sale.number}`,
  });

  const { error } = await supabase.from("sales").update({ status: "ANNULEE" }).eq("id", sale.id);
  if (error) {
    console.error("[adminCancelSaleAction] Échec de l'annulation :", error.message);
    return { error: "Impossible d'annuler la vente" };
  }

  await logAction({
    businessId,
    userId: sale.userId,
    action: "CANCEL",
    entity: "Sale",
    entityId: sale.id,
    details: `Annulée par l'administrateur de la plateforme (${admin.name})`,
  });
  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "CANCEL",
    entity: "Sale",
    entityId: sale.id,
    details: `Vente ${sale.number} annulée, stock réintégré`,
  });

  revalidatePath(`/admin/commercants/${businessId}/ventes`);
  revalidatePath(`/admin/commercants/${businessId}/ventes/${sale.id}`);
  revalidatePath("/ventes/historique");
  revalidatePath(`/ventes/${sale.id}`);
  revalidatePath("/produits");

  return { success: "Vente annulée, stock réintégré" };
}

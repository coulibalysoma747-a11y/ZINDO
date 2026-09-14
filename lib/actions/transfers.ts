"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { adjustStock } from "@/lib/stock";

export type TransferItemInput = {
  productId: string;
  quantity: number;
};

export type CreateTransferInput = {
  fromLocationId: string;
  toLocationId: string;
  items: TransferItemInput[];
  note?: string;
};

export type CreateTransferResult =
  | { success: true; transferId: string }
  | { success: false; error: string };

async function nextTransferNumber(businessId: string) {
  const { data, error } = await supabase.rpc("increment_business_seq", {
    p_business_id: businessId,
    p_field: "next_transfer_seq",
  });
  if (error) throw new Error(`Échec de génération du numéro de transfert : ${error.message}`);
  return `ZND-T-${String(data as number).padStart(6, "0")}`;
}

export async function createTransferAction(input: CreateTransferInput): Promise<CreateTransferResult> {
  const user = await requirePermission(PERMISSIONS.TRANSFERS_MANAGE);

  if (!input.fromLocationId || !input.toLocationId) {
    return { success: false, error: "Sélectionnez les boutiques de départ et d'arrivée" };
  }
  if (input.fromLocationId === input.toLocationId) {
    return { success: false, error: "La boutique de départ et d'arrivée doivent être différentes" };
  }
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "Ajoutez au moins un produit à transférer" };
  }
  for (const item of input.items) {
    if (item.quantity <= 0) return { success: false, error: "Quantité invalide" };
  }

  const [{ data: fromLocation }, { data: toLocation }] = await Promise.all([
    supabase.from("locations").select("id, name").eq("id", input.fromLocationId).eq("business_id", user.businessId).maybeSingle(),
    supabase.from("locations").select("id, name").eq("id", input.toLocationId).eq("business_id", user.businessId).maybeSingle(),
  ]);
  if (!fromLocation) return { success: false, error: "Boutique de départ introuvable" };
  if (!toLocation) return { success: false, error: "Boutique d'arrivée introuvable" };

  const productIds = input.items.map((i) => i.productId);
  const [{ data: products }, { data: stocks }] = await Promise.all([
    supabase.from("products").select("id, name").in("id", productIds).eq("business_id", user.businessId),
    supabase.from("product_stocks").select("productId:product_id, quantity").in("product_id", productIds).eq("location_id", input.fromLocationId),
  ]);
  const productMap = new Map(((products ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p]));
  const stockMap = new Map(((stocks ?? []) as Array<{ productId: string; quantity: number }>).map((s) => [s.productId, s.quantity]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) return { success: false, error: "Un produit est introuvable" };
    const available = stockMap.get(item.productId) ?? 0;
    if (available < item.quantity) {
      return {
        success: false,
        error: `Stock insuffisant pour "${product.name}" à ${fromLocation.name} (disponible : ${available})`,
      };
    }
  }

  const number = await nextTransferNumber(user.businessId);

  const { data: transfer, error: transferError } = await supabase
    .from("stock_transfers")
    .insert({
      business_id: user.businessId,
      number,
      from_location_id: input.fromLocationId,
      to_location_id: input.toLocationId,
      user_id: user.id,
      note: input.note ?? null,
    })
    .select("id")
    .single();
  if (transferError || !transfer) {
    console.error("[createTransferAction] Échec de la création :", transferError?.message);
    return { success: false, error: "Impossible d'enregistrer le transfert" };
  }

  const { error: itemsError } = await supabase
    .from("stock_transfer_items")
    .insert(input.items.map((i) => ({ transfer_id: transfer.id, product_id: i.productId, quantity: i.quantity })));
  if (itemsError) {
    console.error("[createTransferAction] Échec de l'enregistrement des articles :", itemsError.message);
    return { success: false, error: "Impossible d'enregistrer les articles du transfert" };
  }

  for (const item of input.items) {
    const out = await adjustStock({ productId: item.productId, locationId: input.fromLocationId, delta: -item.quantity });
    const { error: outError } = await supabase.from("stock_movements").insert({
      business_id: user.businessId,
      location_id: input.fromLocationId,
      product_id: item.productId,
      direction: "OUT",
      reason: "TRANSFERT",
      quantity: item.quantity,
      old_stock: out.oldStock,
      new_stock: out.newStock,
      user_id: user.id,
      note: `Transfert ${number} vers ${toLocation.name}`,
    });
    if (outError) console.error("[createTransferAction] Échec mouvement sortant :", outError.message);

    const in_ = await adjustStock({ productId: item.productId, locationId: input.toLocationId, delta: item.quantity });
    const { error: inError } = await supabase.from("stock_movements").insert({
      business_id: user.businessId,
      location_id: input.toLocationId,
      product_id: item.productId,
      direction: "IN",
      reason: "TRANSFERT",
      quantity: item.quantity,
      old_stock: in_.oldStock,
      new_stock: in_.newStock,
      user_id: user.id,
      note: `Transfert ${number} depuis ${fromLocation.name}`,
    });
    if (inError) console.error("[createTransferAction] Échec mouvement entrant :", inError.message);
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "StockTransfer",
    entityId: transfer.id as string,
    details: `${fromLocation.name} → ${toLocation.name}`,
  });

  revalidatePath("/transferts");
  revalidatePath("/produits");
  revalidatePath("/stock");
  revalidatePath("/dashboard");

  return { success: true, transferId: transfer.id as string };
}

"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { adjustStock } from "@/lib/stock";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";

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
  try {
    return await createTransferImpl(input);
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[createTransferAction] Erreur inattendue :", e);
    return { success: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

async function createTransferImpl(input: CreateTransferInput): Promise<CreateTransferResult> {
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

  // En parallèle (sortie et entrée touchent deux boutiques différentes, et
  // chaque article est indépendant des autres) — voir la même remarque sur
  // createSaleAction.
  await Promise.all(
    input.items.flatMap((item) => [
      (async () => {
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
      })(),
      (async () => {
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
      })(),
    ])
  );

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

/**
 * Annule un transfert (flag modifier_supprimer_partout) : la marchandise
 * repart de la boutique d'arrivée vers la boutique de départ. Refusé si une
 * partie a déjà été vendue ou sortie à l'arrivée. Les mouvements « Transfert »
 * d'origine restent dans l'historique, suivis de ceux de l'annulation.
 */
export async function cancelTransferAction(transferId: string): Promise<{ error?: string; success?: string }> {
  const user = await requirePermission(PERMISSIONS.TRANSFERS_MANAGE);
  const { data } = await supabase
    .from("stock_transfers")
    .select("id, number, fromLocationId:from_location_id, toLocationId:to_location_id, items:stock_transfer_items(productId:product_id, quantity)")
    .eq("id", transferId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!data) return { error: "Transfert introuvable" };
  const number = data.number as string;
  const fromLocationId = data.fromLocationId as string;
  const toLocationId = data.toLocationId as string;
  const items = (data.items ?? []) as unknown as Array<{ productId: string; quantity: number }>;

  // Quantité à renvoyer par produit (un produit peut figurer sur plusieurs lignes).
  const toReturn = new Map<string, number>();
  for (const i of items) toReturn.set(i.productId, (toReturn.get(i.productId) ?? 0) + i.quantity);
  const productIds = [...toReturn.keys()];

  const [{ data: stocks }, { data: products }, { data: locations }] = await Promise.all([
    supabase.from("product_stocks").select("productId:product_id, quantity").eq("location_id", toLocationId).in("product_id", productIds),
    supabase.from("products").select("id, name").in("id", productIds),
    supabase.from("locations").select("id, name").in("id", [fromLocationId, toLocationId]),
  ]);
  const stockOf = new Map(((stocks ?? []) as Array<{ productId: string; quantity: number }>).map((s) => [s.productId, s.quantity]));
  const nameOf = new Map(((products ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]));
  const locationName = new Map(((locations ?? []) as Array<{ id: string; name: string }>).map((l) => [l.id, l.name]));
  const short = productIds.filter((id) => (stockOf.get(id) ?? 0) < (toReturn.get(id) ?? 0));
  if (short.length > 0) {
    return {
      error: `Impossible : une partie de la marchandise n'est plus à ${locationName.get(toLocationId) ?? "l'arrivée"} (${short
        .map((id) => nameOf.get(id) ?? "produit")
        .join(", ")}). Faites plutôt un nouveau transfert dans l'autre sens.`,
    };
  }

  for (const [productId, quantity] of toReturn) {
    const out = await adjustStock({ productId, locationId: toLocationId, delta: -quantity });
    const back = await adjustStock({ productId, locationId: fromLocationId, delta: quantity });
    const { error: movementError } = await supabase.from("stock_movements").insert([
      {
        business_id: user.businessId,
        location_id: toLocationId,
        product_id: productId,
        direction: "OUT",
        reason: "TRANSFERT",
        quantity,
        old_stock: out.oldStock,
        new_stock: out.newStock,
        user_id: user.id,
        note: `Annulation du transfert ${number}`,
      },
      {
        business_id: user.businessId,
        location_id: fromLocationId,
        product_id: productId,
        direction: "IN",
        reason: "TRANSFERT",
        quantity,
        old_stock: back.oldStock,
        new_stock: back.newStock,
        user_id: user.id,
        note: `Annulation du transfert ${number}`,
      },
    ]);
    if (movementError) console.error("[cancelTransferAction] Échec de l'écriture des mouvements :", movementError.message);
  }

  const { error } = await supabase.from("stock_transfers").delete().eq("id", transferId);
  if (error) {
    console.error("[cancelTransferAction] Échec de la suppression :", error.message);
    return { error: "Le stock a été remis, mais le transfert n'a pas pu être supprimé" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "DELETE",
    entity: "StockTransfer",
    entityId: transferId,
    details: `Transfert ${number} annulé, marchandise renvoyée à ${locationName.get(fromLocationId) ?? "la boutique de départ"}`,
  });

  revalidatePath("/transferts");
  revalidatePath("/stock");
  revalidatePath("/produits");
  return { success: "Transfert annulé" };
}

"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generateInventoryReference } from "@/lib/reference";
import { adjustStock } from "@/lib/stock";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";

export type CreateInventoryInput = {
  locationId: string;
  items: { productId: string; realQty: number }[];
  note?: string;
};

export type CreateInventoryResult =
  | { success: true; inventoryId: string }
  | { success: false; error: string };

export async function createInventoryAction(input: CreateInventoryInput): Promise<CreateInventoryResult> {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE);

  if (!input.locationId) return { success: false, error: "Sélectionnez une boutique" };
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "Sélectionnez au moins un produit à compter" };
  }

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", input.locationId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!location) return { success: false, error: "Boutique introuvable" };

  const productIds = input.items.map((i) => i.productId);
  const [{ data: products }, { data: stocks }] = await Promise.all([
    supabase.from("products").select("id").in("id", productIds).eq("business_id", user.businessId),
    supabase.from("product_stocks").select("productId:product_id, quantity").in("product_id", productIds).eq("location_id", input.locationId),
  ]);
  const productIdSet = new Set((products ?? []).map((p) => p.id as string));
  const stockMap = new Map(((stocks ?? []) as Array<{ productId: string; quantity: number }>).map((s) => [s.productId, s.quantity]));

  const { data: inventory, error: inventoryError } = await supabase
    .from("inventories")
    .insert({
      business_id: user.businessId,
      location_id: input.locationId,
      reference: generateInventoryReference(),
      status: "EN_COURS",
      note: input.note ?? null,
      user_id: user.id,
    })
    .select("id")
    .single();
  if (inventoryError || !inventory) {
    console.error("[createInventoryAction] Échec de la création :", inventoryError?.message);
    return { success: false, error: "Impossible de créer l'inventaire" };
  }

  const itemsToCreate = input.items
    .filter((i) => productIdSet.has(i.productId))
    .map((i) => {
      const theoreticalQty = stockMap.get(i.productId) ?? 0;
      return {
        inventory_id: inventory.id,
        product_id: i.productId,
        theoretical_qty: theoreticalQty,
        real_qty: i.realQty,
        difference: i.realQty - theoreticalQty,
      };
    });
  const { error: itemsError } = await supabase.from("inventory_items").insert(itemsToCreate);
  if (itemsError) {
    console.error("[createInventoryAction] Échec de l'enregistrement des articles :", itemsError.message);
    return { success: false, error: "Impossible d'enregistrer les articles de l'inventaire" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Inventory",
    entityId: inventory.id as string,
  });

  revalidatePath("/inventaire");
  return { success: true, inventoryId: inventory.id as string };
}

export async function validateInventoryAction(inventoryId: string) {
  try {
    return await validateInventoryImpl(inventoryId);
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[validateInventoryAction] Erreur inattendue :", e);
    return { error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

async function validateInventoryImpl(inventoryId: string) {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE);

  const { data: inventory } = await supabase
    .from("inventories")
    .select("id, locationId:location_id, reference, status")
    .eq("id", inventoryId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!inventory) return { error: "Inventaire introuvable" };
  if (inventory.status === "VALIDE") return { error: "Cet inventaire est déjà validé" };

  const { data: items } = await supabase
    .from("inventory_items")
    .select("productId:product_id, difference")
    .eq("inventory_id", inventory.id);

  // En parallèle — un inventaire peut porter sur des dizaines/centaines de
  // produits, un for-loop séquentiel risquait le délai maximum d'une
  // fonction Vercel (voir la même remarque sur createSaleAction).
  await Promise.all(
    ((items ?? []) as Array<{ productId: string; difference: number }>)
      .filter((item) => item.difference !== 0)
      .map(async (item) => {
        const { oldStock, newStock } = await adjustStock({
          productId: item.productId,
          locationId: inventory.locationId as string,
          delta: item.difference,
        });

        const { error: movementError } = await supabase.from("stock_movements").insert({
          business_id: user.businessId,
          location_id: inventory.locationId,
          product_id: item.productId,
          direction: item.difference > 0 ? "IN" : "OUT",
          reason: "INVENTAIRE",
          quantity: Math.abs(item.difference),
          old_stock: oldStock,
          new_stock: newStock,
          user_id: user.id,
          note: `Correction inventaire ${inventory.reference}`,
        });
        if (movementError) console.error("[validateInventoryAction] Échec de l'écriture du mouvement :", movementError.message);
      })
  );

  const { error: updateError } = await supabase
    .from("inventories")
    .update({ status: "VALIDE", validated_at: new Date().toISOString() })
    .eq("id", inventory.id);
  if (updateError) {
    console.error("[validateInventoryAction] Échec de la validation :", updateError.message);
    return { error: "Impossible de valider l'inventaire" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "VALIDATE",
    entity: "Inventory",
    entityId: inventory.id as string,
  });

  revalidatePath("/inventaire");
  revalidatePath(`/inventaire/${inventory.id}`);
  revalidatePath("/produits");
  return { success: "Inventaire validé, le stock a été mis à jour" };
}

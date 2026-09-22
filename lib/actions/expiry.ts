"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { registerFeatureFlag, isFeatureEnabled } from "@/lib/feature-flags";
import { EXPIRY_FLAG, EXPIRY_ACTIVITIES } from "@/lib/nav";

export type ActionState = { error?: string; success?: string } | undefined;

/**
 * Péremption (DLC) : nouvelle fonctionnalité, désactivée par défaut tant
 * qu'elle n'est pas explicitement activée depuis /admin/fonctionnalites —
 * voir la règle du memory "Feature rollout rule". N'est de toute façon
 * jamais visible hors des activités listées dans EXPIRY_ACTIVITIES
 * (supermarché/alimentation, pharmacie — voir lib/nav.ts).
 */
export async function ensureExpiryFlagRegistered() {
  await registerFeatureFlag(
    EXPIRY_FLAG,
    "Péremption (DLC)",
    "Enregistrez la date de péremption des lots reçus et repérez les produits bientôt périmés — supermarchés/alimentation et pharmacies."
  );
}

export async function isExpiryModuleEnabled(businessId: string) {
  return isFeatureEnabled(EXPIRY_FLAG, businessId);
}

export type ExpiryBatchRow = {
  id: string;
  productId: string;
  productName: string;
  productReference: string;
  unit: string;
  locationName: string;
  quantity: number;
  expiryDate: string;
  note: string | null;
};

type ExpiryBatchQueryRow = {
  id: string;
  productId: string;
  quantity: number;
  expiryDate: string;
  note: string | null;
  product: { name: string; reference: string; unit: string } | null;
  location: { name: string } | null;
};

export async function getExpiryBatchesAction(): Promise<ExpiryBatchRow[]> {
  const user = await requirePermission(PERMISSIONS.EXPIRY_MANAGE);

  const { data } = await supabase
    .from("product_expiry_batches")
    .select(
      "id, productId:product_id, quantity, expiryDate:expiry_date, note, product:products(name, reference, unit), location:locations(name)"
    )
    .eq("business_id", user.businessId)
    .order("expiry_date", { ascending: true });

  return ((data ?? []) as unknown as ExpiryBatchQueryRow[]).map((r) => ({
    id: r.id,
    productId: r.productId,
    productName: r.product?.name ?? "Produit supprimé",
    productReference: r.product?.reference ?? "",
    unit: r.product?.unit ?? "unité",
    locationName: r.location?.name ?? "",
    quantity: r.quantity,
    expiryDate: r.expiryDate,
    note: r.note,
  }));
}

const batchSchema = z.object({
  productId: z.string().min(1, "Produit requis"),
  locationId: z.string().min(1, "Boutique requise"),
  quantity: z.coerce.number().int().positive("Quantité invalide"),
  expiryDate: z.string().min(1, "Date de péremption requise"),
  note: z.string().optional(),
});

export async function addExpiryBatchAction(formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.EXPIRY_MANAGE);
  if (!(await isExpiryModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = batchSchema.safeParse({
    productId: formData.get("productId"),
    locationId: formData.get("locationId"),
    quantity: formData.get("quantity"),
    expiryDate: formData.get("expiryDate"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", parsed.data.productId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!product) return { error: "Produit introuvable" };

  const { error } = await supabase.from("product_expiry_batches").insert({
    business_id: user.businessId,
    location_id: parsed.data.locationId,
    product_id: parsed.data.productId,
    quantity: parsed.data.quantity,
    expiry_date: parsed.data.expiryDate,
    note: parsed.data.note || null,
    user_id: user.id,
  });
  if (error) {
    console.error("[addExpiryBatchAction] Échec de l'enregistrement :", error.message);
    return { error: "Impossible d'enregistrer le lot" };
  }

  revalidatePath("/peremption");
  return { success: "Lot enregistré" };
}

export async function deleteExpiryBatchAction(batchId: string): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.EXPIRY_MANAGE);

  const { data: batch } = await supabase
    .from("product_expiry_batches")
    .select("id")
    .eq("id", batchId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!batch) return { error: "Lot introuvable" };

  const { error } = await supabase.from("product_expiry_batches").delete().eq("id", batchId);
  if (error) {
    console.error("[deleteExpiryBatchAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer le lot" };
  }

  revalidatePath("/peremption");
  return { success: "Lot retiré du suivi" };
}

/**
 * Date de péremption la plus proche par produit, à un emplacement donné —
 * simple indication affichée à la caisse (voir POS.tsx) pour que le vendeur
 * sache qu'un lot arrive à échéance, sans lui imposer de choix. Ne renvoie
 * rien pour un commerce hors EXPIRY_ACTIVITIES ou sans le module activé, sur
 * le même modèle que fetchPackagingUnitsByProduct
 * (lib/actions/product-search.ts).
 */
export async function getNearestExpiryByProduct(
  businessId: string,
  locationId: string,
  productIds: string[],
  activityKey: string | null
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (productIds.length === 0) return map;
  if (!EXPIRY_ACTIVITIES.includes(activityKey ?? "")) return map;
  if (!(await isExpiryModuleEnabled(businessId))) return map;

  const { data } = await supabase
    .from("product_expiry_batches")
    .select("productId:product_id, expiryDate:expiry_date")
    .eq("business_id", businessId)
    .eq("location_id", locationId)
    .in("product_id", productIds)
    .order("expiry_date", { ascending: true });

  for (const row of (data ?? []) as unknown as { productId: string; expiryDate: string }[]) {
    if (!map.has(row.productId)) map.set(row.productId, row.expiryDate);
  }
  return map;
}

/**
 * Décrément FEFO (First Expired, First Out) best-effort au moment d'une
 * vente : consomme en priorité le lot dont la date de péremption est la
 * plus proche. Purement déclaratif comme le reste du module Péremption
 * (product_expiry_batches n'est pas la source de vérité du stock —
 * product_stocks l'est, déjà ajusté séparément par recordStockMovements) :
 * n'échoue jamais, ne bloque jamais une vente, et s'arrête simplement si les
 * lots connus ne couvrent pas toute la quantité vendue (stock non
 * entièrement "loti"). Voir lib/actions/sales.ts::createSaleImpl.
 */
export async function consumeExpiryBatchesFefo(
  items: { productId: string; quantity: number }[],
  params: { businessId: string; locationId: string; activityKey: string | null }
) {
  if (!EXPIRY_ACTIVITIES.includes(params.activityKey ?? "")) return;
  if (!(await isExpiryModuleEnabled(params.businessId))) return;

  await Promise.all(
    items.filter((i) => i.quantity > 0).map((i) => consumeOneProductFefo(i, params))
  );
}

async function consumeOneProductFefo(
  item: { productId: string; quantity: number },
  params: { businessId: string; locationId: string }
) {
  let remaining = item.quantity;

  const { data: batches, error } = await supabase
    .from("product_expiry_batches")
    .select("id, quantity")
    .eq("business_id", params.businessId)
    .eq("location_id", params.locationId)
    .eq("product_id", item.productId)
    .order("expiry_date", { ascending: true });
  if (error) {
    console.error("[consumeOneProductFefo] Échec de la lecture des lots :", error.message);
    return;
  }

  for (const batch of (batches ?? []) as { id: string; quantity: number }[]) {
    if (remaining <= 0) break;
    const taken = Math.min(batch.quantity, remaining);
    remaining -= taken;
    const newQuantity = batch.quantity - taken;

    const { error: writeError } =
      newQuantity > 0
        ? await supabase.from("product_expiry_batches").update({ quantity: newQuantity }).eq("id", batch.id)
        : await supabase.from("product_expiry_batches").delete().eq("id", batch.id);
    if (writeError) {
      console.error("[consumeOneProductFefo] Échec de la mise à jour du lot :", writeError.message);
    }
  }
}

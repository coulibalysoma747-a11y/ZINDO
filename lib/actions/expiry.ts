"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { registerFeatureFlag, isFeatureEnabled } from "@/lib/feature-flags";
import { EXPIRY_FLAG } from "@/lib/nav";

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

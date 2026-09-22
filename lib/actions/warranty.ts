"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { WARRANTY_FLAG, ELECTRONICS_ACTIVITY_KEY } from "@/lib/nav";

export { ELECTRONICS_ACTIVITY_KEY };

export type ActionState = { error?: string; success?: string } | undefined;

/**
 * Garantie produits : nouvelle fonctionnalité, désactivée par défaut tant
 * qu'elle n'est pas explicitement activée depuis /admin/fonctionnalites —
 * voir la règle du memory "Feature rollout rule".
 */
export async function ensureWarrantyFlagRegistered() {
  await registerFeatureFlag(
    WARRANTY_FLAG,
    "Garantie produits",
    "Enregistrer le numéro de série/IMEI et la durée de garantie d'un appareil vendu, pour vérifier instantanément au service après-vente s'il est encore couvert — pour l'électronique et la téléphonie."
  );
}

export async function isWarrantyModuleEnabled(businessId: string): Promise<boolean> {
  await ensureWarrantyFlagRegistered();
  return isFeatureEnabled(WARRANTY_FLAG, businessId);
}

export type WarrantyRecord = {
  id: string;
  serialNumber: string;
  soldAt: string;
  warrantyMonths: number;
  warrantyExpiresAt: string;
  note: string | null;
  product: { id: string; name: string } | null;
  customer: { id: string; name: string; phone: string | null } | null;
};

const RECORD_FIELDS =
  "id, serialNumber:serial_number, soldAt:sold_at, warrantyMonths:warranty_months, warrantyExpiresAt:warranty_expires_at, note, product:products(id, name), customer:customers(id, name, phone)";

function addMonths(dateIso: string, months: number): string {
  const d = new Date(dateIso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const registerSchema = z.object({
  productId: z.string().min(1, "Choisissez un produit"),
  customerId: z.string().optional(),
  serialNumber: z.string().min(1, "Le numéro de série / IMEI est requis"),
  soldAt: z.string().min(1, "La date de vente est requise"),
  warrantyMonths: z.coerce.number().int().positive("Durée de garantie invalide"),
  note: z.string().optional(),
});

export async function registerWarrantyAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.WARRANTY_MANAGE);
  if (!(await isWarrantyModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = registerSchema.safeParse({
    productId: formData.get("productId"),
    customerId: formData.get("customerId") || undefined,
    serialNumber: formData.get("serialNumber"),
    soldAt: formData.get("soldAt"),
    warrantyMonths: formData.get("warrantyMonths"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const { data: product } = await supabase.from("products").select("id").eq("id", data.productId).eq("business_id", user.businessId).maybeSingle();
  if (!product) return { error: "Produit introuvable" };

  const { data: existing } = await supabase.from("warranty_records").select("id").eq("business_id", user.businessId).eq("serial_number", data.serialNumber).maybeSingle();
  if (existing) return { error: "Ce numéro de série est déjà enregistré" };

  const { error } = await supabase.from("warranty_records").insert({
    business_id: user.businessId,
    product_id: data.productId,
    customer_id: data.customerId || null,
    serial_number: data.serialNumber,
    sold_at: data.soldAt,
    warranty_months: data.warrantyMonths,
    warranty_expires_at: addMonths(data.soldAt, data.warrantyMonths),
    note: data.note ?? null,
    user_id: user.id,
  });
  if (error) {
    console.error("[registerWarrantyAction] Échec de l'enregistrement :", error.message);
    return error.code === "23505" ? { error: "Ce numéro de série est déjà enregistré" } : { error: "Impossible d'enregistrer la garantie" };
  }

  revalidatePath("/garantie");
  return { success: "Garantie enregistrée" };
}

export async function searchWarrantyAction(query: string): Promise<WarrantyRecord[]> {
  const user = await requirePermission(PERMISSIONS.WARRANTY_MANAGE);
  const trimmed = query.trim();
  if (!trimmed) return [];

  const escaped = trimmed.replace(/[%_\\]/g, (m) => `\\${m}`);
  const { data } = await supabase
    .from("warranty_records")
    .select(RECORD_FIELDS)
    .eq("business_id", user.businessId)
    .ilike("serial_number", `%${escaped}%`)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as unknown as WarrantyRecord[];
}

export async function deleteWarrantyAction(id: string): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.WARRANTY_MANAGE);
  const { data: record } = await supabase.from("warranty_records").select("id").eq("id", id).eq("business_id", user.businessId).maybeSingle();
  if (!record) return { error: "Garantie introuvable" };

  const { error } = await supabase.from("warranty_records").delete().eq("id", id);
  if (error) {
    console.error("[deleteWarrantyAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer cet enregistrement" };
  }

  revalidatePath("/garantie");
  return { success: "Enregistrement supprimé" };
}

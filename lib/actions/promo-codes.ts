"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import type { PromoDiscountType } from "@/lib/db-types";

export type PromoCodeSummary = {
  id: string;
  code: string;
  discountType: PromoDiscountType;
  discountValue: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  minOrderAmount: number;
  usageLimit: number | null;
  usedCount: number;
  createdAt: string;
};

async function requireStoreId(businessId: string) {
  const { data: store } = await supabase
    .from("online_stores")
    .select("id")
    .eq("business_id", businessId)
    .maybeSingle();
  return store?.id as string | undefined;
}

export async function listPromoCodesAction(): Promise<PromoCodeSummary[]> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const storeId = await requireStoreId(user.businessId);
  if (!storeId) return [];

  const { data } = await supabase
    .from("promo_codes")
    .select(
      "id, code, discountType:discount_type, discountValue:discount_value, active, startsAt:starts_at, endsAt:ends_at, minOrderAmount:min_order_amount, usageLimit:usage_limit, usedCount:used_count, createdAt:created_at"
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as PromoCodeSummary[];
}

export type ActionState = { error?: string; success?: string } | undefined;

const createSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "2 caractères minimum")
      .max(30, "30 caractères maximum")
      .transform((v) => v.toUpperCase()),
    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    discountValue: z.coerce.number().positive("La valeur doit être supérieure à 0"),
    startsAt: z.string().optional(),
    endsAt: z.string().optional(),
    minOrderAmount: z.coerce.number().min(0).default(0),
    usageLimit: z.coerce.number().int().positive().optional(),
  })
  .refine((v) => v.discountType !== "PERCENTAGE" || v.discountValue <= 100, {
    message: "Un pourcentage ne peut pas dépasser 100",
    path: ["discountValue"],
  });

export async function createPromoCodeAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const storeId = await requireStoreId(user.businessId);
  if (!storeId) return { error: "Créez d'abord votre boutique en ligne avant d'ajouter des codes promo" };

  const parsed = createSchema.safeParse({
    code: formData.get("code"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue"),
    startsAt: formData.get("startsAt") || undefined,
    endsAt: formData.get("endsAt") || undefined,
    minOrderAmount: formData.get("minOrderAmount") || 0,
    usageLimit: formData.get("usageLimit") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  if (data.startsAt && data.endsAt && new Date(data.endsAt) < new Date(data.startsAt)) {
    return { error: "La date de fin doit être après la date de début" };
  }

  const { data: existing } = await supabase
    .from("promo_codes")
    .select("id")
    .eq("store_id", storeId)
    .eq("code", data.code)
    .maybeSingle();
  if (existing) return { error: "Ce code existe déjà" };

  const { data: created, error } = await supabase
    .from("promo_codes")
    .insert({
      store_id: storeId,
      code: data.code,
      discount_type: data.discountType,
      discount_value: data.discountValue,
      starts_at: data.startsAt ? new Date(data.startsAt).toISOString() : null,
      ends_at: data.endsAt ? new Date(data.endsAt).toISOString() : null,
      min_order_amount: data.minOrderAmount,
      usage_limit: data.usageLimit ?? null,
    })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[createPromoCodeAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer ce code promo" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "PromoCode",
    entityId: created.id as string,
    details: data.code,
  });

  revalidatePath("/boutique-en-ligne/codes-promo");
  return { success: "Code promo créé" };
}

export async function togglePromoCodeAction(id: string, active: boolean): Promise<{ error?: string }> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const storeId = await requireStoreId(user.businessId);
  if (!storeId) return { error: "Boutique introuvable" };

  const { error } = await supabase
    .from("promo_codes")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", storeId);
  if (error) {
    console.error("[togglePromoCodeAction] Échec :", error.message);
    return { error: "Impossible de modifier ce code promo" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: active ? "ACTIVATE" : "DEACTIVATE",
    entity: "PromoCode",
    entityId: id,
  });

  revalidatePath("/boutique-en-ligne/codes-promo");
  return {};
}

export async function deletePromoCodeAction(id: string): Promise<{ error?: string }> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const storeId = await requireStoreId(user.businessId);
  if (!storeId) return { error: "Boutique introuvable" };

  const { error } = await supabase.from("promo_codes").delete().eq("id", id).eq("store_id", storeId);
  if (error) {
    console.error("[deletePromoCodeAction] Échec :", error.message);
    return { error: "Impossible de supprimer ce code promo" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "DELETE",
    entity: "PromoCode",
    entityId: id,
  });

  revalidatePath("/boutique-en-ligne/codes-promo");
  return {};
}

export type PromoValidationResult =
  | { valid: true; promoCodeId: string; discount: number; label: string }
  | { valid: false; error: string };

/**
 * Source de vérité unique pour l'éligibilité d'un code promo — utilisée à la
 * fois pour l'aperçu côté client (avant validation de la commande) et pour le
 * recalcul côté serveur au moment de créer la commande. Ne jamais faire
 * confiance à un montant de remise envoyé par le client.
 */
export async function validatePromoCode(
  storeId: string,
  rawCode: string,
  subtotal: number
): Promise<PromoValidationResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, error: "Indiquez un code promo" };

  const { data: promo } = await supabase
    .from("promo_codes")
    .select(
      "id, active, discountType:discount_type, discountValue:discount_value, startsAt:starts_at, endsAt:ends_at, minOrderAmount:min_order_amount, usageLimit:usage_limit, usedCount:used_count"
    )
    .eq("store_id", storeId)
    .eq("code", code)
    .maybeSingle();

  if (!promo) return { valid: false, error: "Code promo invalide" };
  if (!promo.active) return { valid: false, error: "Ce code n'est plus valide" };

  const now = new Date();
  if (promo.startsAt && now < new Date(promo.startsAt as string)) {
    return { valid: false, error: "Ce code n'est pas encore actif" };
  }
  if (promo.endsAt && now > new Date(promo.endsAt as string)) {
    return { valid: false, error: "Ce code a expiré" };
  }
  const minOrderAmount = (promo.minOrderAmount as number) ?? 0;
  if (minOrderAmount > 0 && subtotal < minOrderAmount) {
    return { valid: false, error: `Montant minimum pour ce code : ${minOrderAmount}` };
  }
  const usageLimit = promo.usageLimit as number | null;
  const usedCount = promo.usedCount as number;
  if (usageLimit != null && usedCount >= usageLimit) {
    return { valid: false, error: "Ce code a atteint sa limite d'utilisation" };
  }

  const discountType = promo.discountType as PromoDiscountType;
  const discountValue = promo.discountValue as number;
  const discount =
    discountType === "PERCENTAGE" ? Math.round((subtotal * discountValue) / 100) : Math.min(discountValue, subtotal);

  return {
    valid: true,
    promoCodeId: promo.id as string,
    discount,
    label: discountType === "PERCENTAGE" ? `-${discountValue}%` : `-${discountValue}`,
  };
}

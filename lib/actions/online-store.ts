"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import type { OnlineOrderStatus } from "@/lib/db-types";

export type ActionState = { error?: string; success?: string } | undefined;

const slugSchema = z
  .string()
  .min(3, "3 caractères minimum")
  .max(40, "40 caractères maximum")
  .regex(/^[a-z0-9-]+$/, "Uniquement des minuscules, chiffres et tirets (ex : quincaillerie-some)");

const storeSchema = z.object({
  slug: slugSchema,
  storeName: z.string().min(1, "Le nom de la boutique est requis"),
  description: z.string().optional(),
  contactPhone: z.string().optional(),
  locationId: z.string().optional(),
  deliveryEnabled: z.coerce.boolean(),
  deliveryFee: z.coerce.number().min(0).default(0),
  freeDeliveryAbove: z.coerce.number().min(0).optional(),
  published: z.coerce.boolean(),
});

export async function saveOnlineStoreAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = storeSchema.safeParse({
    slug: (formData.get("slug") as string)?.trim().toLowerCase(),
    storeName: formData.get("storeName"),
    description: formData.get("description") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
    locationId: formData.get("locationId") || undefined,
    deliveryEnabled: formData.get("deliveryEnabled") === "on",
    deliveryFee: formData.get("deliveryFee") || 0,
    freeDeliveryAbove: formData.get("freeDeliveryAbove") || undefined,
    published: formData.get("published") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  if (parsed.data.published && !parsed.data.locationId) {
    return { error: "Choisissez la boutique/dépôt qui servira les commandes avant de publier" };
  }

  const { data: slugTaken } = await supabase
    .from("online_stores")
    .select("id")
    .eq("slug", parsed.data.slug)
    .neq("business_id", user.businessId)
    .maybeSingle();
  if (slugTaken) return { error: "Cette adresse est déjà utilisée par un autre commerce, choisissez-en une autre" };

  if (parsed.data.locationId) {
    const { data: location } = await supabase
      .from("locations")
      .select("id")
      .eq("id", parsed.data.locationId)
      .eq("business_id", user.businessId)
      .maybeSingle();
    if (!location) return { error: "Boutique/dépôt introuvable" };
  }

  const { error } = await supabase.from("online_stores").upsert(
    {
      business_id: user.businessId,
      slug: parsed.data.slug,
      store_name: parsed.data.storeName,
      description: parsed.data.description ?? null,
      contact_phone: parsed.data.contactPhone ?? null,
      location_id: parsed.data.locationId ?? null,
      delivery_enabled: parsed.data.deliveryEnabled,
      delivery_fee: parsed.data.deliveryFee,
      free_delivery_above: parsed.data.freeDeliveryAbove ?? null,
      published: parsed.data.published,
    },
    { onConflict: "business_id", ignoreDuplicates: false }
  );
  if (error) {
    console.error("[saveOnlineStoreAction] Échec de l'enregistrement :", error.message);
    return { error: "Impossible d'enregistrer la boutique en ligne" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "OnlineStore",
    details: parsed.data.published ? "Publiée" : "Enregistrée (non publiée)",
  });

  revalidatePath("/boutique-en-ligne");
  return { success: "Boutique en ligne enregistrée" };
}

export async function updateOnlineOrderStatusAction(
  orderId: string,
  status: OnlineOrderStatus,
  merchantNote?: string
) {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const { data: order } = await supabase
    .from("online_orders")
    .select("id, merchantNote:merchant_note, store:online_stores!inner(businessId:business_id)")
    .eq("id", orderId)
    .eq("online_stores.business_id", user.businessId)
    .maybeSingle();
  if (!order) return { error: "Commande introuvable" };

  const { error } = await supabase
    .from("online_orders")
    .update({ status, merchant_note: merchantNote ?? (order.merchantNote as string | null) })
    .eq("id", orderId);
  if (error) {
    console.error("[updateOnlineOrderStatusAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour la commande" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "OnlineOrder",
    entityId: orderId,
    details: status,
  });

  revalidatePath("/boutique-en-ligne/commandes");
  return { success: "Commande mise à jour" };
}

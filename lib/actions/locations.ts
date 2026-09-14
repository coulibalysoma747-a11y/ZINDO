"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { checkLimit } from "@/lib/subscription";

export type ActionState = { error?: string; success?: string } | undefined;

const locationSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  type: z.enum(["BOUTIQUE", "DEPOT"]),
  address: z.string().optional(),
  city: z.string().optional(),
});

function parse(formData: FormData) {
  return locationSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
  });
}

export async function createLocationAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.LOCATIONS_MANAGE);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const limit = await checkLimit(user.businessId, "locations");
  if (!limit.ok) {
    return {
      error: `Limite de votre abonnement atteinte (${limit.current}/${limit.limit} boutiques) — passez à un palier supérieur pour en ajouter davantage.`,
    };
  }

  const { data: existing } = await supabase
    .from("locations")
    .select("id")
    .eq("business_id", user.businessId)
    .eq("name", parsed.data.name)
    .maybeSingle();
  if (existing) return { error: "Une boutique porte déjà ce nom" };

  const { data: location, error } = await supabase
    .from("locations")
    .insert({
      business_id: user.businessId,
      name: parsed.data.name,
      type: parsed.data.type,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
    })
    .select("id")
    .single();
  if (error || !location) {
    console.error("[createLocationAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer la boutique" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Location",
    entityId: location.id as string,
  });

  revalidatePath("/boutiques");
  return { success: "Boutique créée" };
}

export async function updateLocationAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.LOCATIONS_MANAGE);
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!location) return { error: "Boutique introuvable" };

  const { error } = await supabase
    .from("locations")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
    })
    .eq("id", id);
  if (error) {
    console.error("[updateLocationAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour la boutique" };
  }

  revalidatePath("/boutiques");
  return { success: "Boutique mise à jour" };
}

export async function setDefaultLocationAction(id: string) {
  const user = await requirePermission(PERMISSIONS.LOCATIONS_MANAGE);
  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!location) return { error: "Boutique introuvable" };

  const { error: clearError } = await supabase
    .from("locations")
    .update({ is_default: false })
    .eq("business_id", user.businessId);
  if (clearError) {
    console.error("[setDefaultLocationAction] Échec de la réinitialisation :", clearError.message);
    return { error: "Impossible de mettre à jour la boutique par défaut" };
  }

  const { error } = await supabase.from("locations").update({ is_default: true }).eq("id", id);
  if (error) {
    console.error("[setDefaultLocationAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour la boutique par défaut" };
  }

  revalidatePath("/boutiques");
  return { success: "Boutique par défaut mise à jour" };
}

export async function toggleLocationActiveAction(id: string, active: boolean) {
  const user = await requirePermission(PERMISSIONS.LOCATIONS_MANAGE);
  const { data: location } = await supabase
    .from("locations")
    .select("id, isDefault:is_default")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!location) return { error: "Boutique introuvable" };
  if (location.isDefault && !active) {
    return { error: "Impossible de désactiver la boutique par défaut" };
  }

  const { count: activeCount } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("business_id", user.businessId)
    .eq("active", true);
  if (!active && (activeCount ?? 0) <= 1) {
    return { error: "Le commerce doit conserver au moins une boutique active" };
  }

  const { error } = await supabase.from("locations").update({ active }).eq("id", id);
  if (error) {
    console.error("[toggleLocationActiveAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour la boutique" };
  }

  revalidatePath("/boutiques");
  return { success: active ? "Boutique réactivée" : "Boutique désactivée" };
}

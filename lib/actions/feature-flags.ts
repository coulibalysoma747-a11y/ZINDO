"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";

export type ActionState = { error?: string; success?: string } | undefined;

const flagSchema = z.object({
  key: z
    .string()
    .min(1, "La clé est requise")
    .regex(/^[a-z0-9_]+$/, "Uniquement des minuscules, chiffres et underscores"),
  label: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
});

export async function createFeatureFlagAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireSuperAdmin();
  const parsed = flagSchema.safeParse({
    key: formData.get("key"),
    label: formData.get("label"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: existing } = await supabase.from("feature_flags").select("id").eq("key", parsed.data.key).maybeSingle();
  if (existing) return { error: "Cette clé existe déjà" };

  const { data: flag, error } = await supabase
    .from("feature_flags")
    .insert({ key: parsed.data.key, label: parsed.data.label, description: parsed.data.description ?? null })
    .select("id, key")
    .single();
  if (error || !flag) {
    console.error("[createFeatureFlagAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer la fonctionnalité" };
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "CREATE",
    entity: "FeatureFlag",
    entityId: flag.id as string,
    details: flag.key as string,
  });

  revalidatePath("/admin/fonctionnalites");
  return { success: "Fonctionnalité enregistrée — désactivée pour tout le monde par défaut" };
}

export async function setFeatureFlagGlobalAction(flagId: string, enabledGlobally: boolean) {
  const admin = await requireSuperAdmin();
  const { data: flag, error } = await supabase
    .from("feature_flags")
    .update({ enabled_globally: enabledGlobally })
    .eq("id", flagId)
    .select("key")
    .single();
  if (error || !flag) {
    console.error("[setFeatureFlagGlobalAction] Échec de la mise à jour :", error?.message);
    return { error: "Impossible de mettre à jour la fonctionnalité" };
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: enabledGlobally ? "ENABLE_ALL" : "DISABLE_ALL",
    entity: "FeatureFlag",
    entityId: flagId,
    details: flag.key as string,
  });
  revalidatePath("/admin/fonctionnalites");
  return { success: enabledGlobally ? "Activée pour tous les commerçants" : "Désactivée globalement" };
}

export async function setFeatureFlagBusinessAction(flagId: string, businessId: string, enabled: boolean) {
  const admin = await requireSuperAdmin();
  const { error } = await supabase
    .from("feature_flag_businesses")
    .upsert(
      { feature_flag_id: flagId, business_id: businessId, enabled },
      { onConflict: "feature_flag_id,business_id", ignoreDuplicates: false }
    );
  if (error) {
    console.error("[setFeatureFlagBusinessAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour pour ce commerce" };
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "SET",
    entity: "FeatureFlagBusiness",
    entityId: businessId,
    details: `${flagId} -> ${enabled}`,
  });
  revalidatePath("/admin/fonctionnalites");
  return { success: "Mis à jour pour ce commerce" };
}

export async function setFeatureFlagLocationAction(flagId: string, locationId: string, enabled: boolean) {
  const admin = await requireSuperAdmin();
  const { error } = await supabase
    .from("feature_flag_locations")
    .upsert(
      { feature_flag_id: flagId, location_id: locationId, enabled },
      { onConflict: "feature_flag_id,location_id", ignoreDuplicates: false }
    );
  if (error) {
    console.error("[setFeatureFlagLocationAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour pour cette boutique" };
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "SET",
    entity: "FeatureFlagLocation",
    entityId: locationId,
    details: `${flagId} -> ${enabled}`,
  });
  revalidatePath("/admin/fonctionnalites");
  return { success: "Mis à jour pour cette boutique" };
}

/**
 * Active/désactive une fonctionnalité pour TOUTE une activité (ex. tous les
 * "Atelier de réparation") de façon persistante — contrairement à une
 * activation en masse ponctuelle, cette règle s'applique aussi à un commerce
 * qui choisirait cette activité plus tard, sans réintervention du
 * super-admin. Voir feature_flag_activities et
 * lib/feature-flags.ts::isFeatureEnabled pour la priorité exacte (une
 * dérogation par commerce précis reste prioritaire sur cette règle).
 */
export async function setFeatureFlagActivityAction(flagId: string, activityKey: string, enabled: boolean) {
  const admin = await requireSuperAdmin();
  const { error } = await supabase
    .from("feature_flag_activities")
    .upsert(
      { feature_flag_id: flagId, activity_key: activityKey, enabled },
      { onConflict: "feature_flag_id,activity_key", ignoreDuplicates: false }
    );
  if (error) {
    console.error("[setFeatureFlagActivityAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour pour cette activité" };
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "SET",
    entity: "FeatureFlagActivity",
    entityId: activityKey,
    details: `${flagId} -> ${enabled}`,
  });
  revalidatePath("/admin/fonctionnalites");
  return { success: enabled ? "Activée pour cette activité (y compris les futurs commerces)" : "Désactivée pour cette activité" };
}

export async function clearFeatureFlagLocationAction(flagId: string, locationId: string) {
  const admin = await requireSuperAdmin();
  const { error } = await supabase
    .from("feature_flag_locations")
    .delete()
    .eq("feature_flag_id", flagId)
    .eq("location_id", locationId);
  if (error) {
    console.error("[clearFeatureFlagLocationAction] Échec de la suppression :", error.message);
    return { error: "Impossible de réinitialiser cette boutique" };
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "CLEAR",
    entity: "FeatureFlagLocation",
    entityId: locationId,
    details: flagId,
  });
  revalidatePath("/admin/fonctionnalites");
  return { success: "Réglage par boutique réinitialisé (suit le réglage du commerce)" };
}

export async function deleteFeatureFlagAction(flagId: string) {
  const admin = await requireSuperAdmin();
  const { data: flag } = await supabase.from("feature_flags").select("key").eq("id", flagId).maybeSingle();
  const { error } = await supabase.from("feature_flags").delete().eq("id", flagId);
  if (error) {
    console.error("[deleteFeatureFlagAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer la fonctionnalité" };
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "DELETE",
    entity: "FeatureFlag",
    entityId: flagId,
    details: (flag?.key as string | undefined) ?? "",
  });
  revalidatePath("/admin/fonctionnalites");
  return { success: "Fonctionnalité supprimée" };
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireUserAllowingActivitySetup, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ACTIVITIES } from "@/lib/activities";
import { getActivityConfig } from "@/lib/activity-config";
import { logAction } from "@/lib/audit";

export type ActionState = { error?: string } | undefined;

export async function setBusinessActivityAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUserAllowingActivitySetup();

  const activityKey = String(formData.get("activityKey") ?? "");
  const activity = ACTIVITIES.find((a) => a.key === activityKey);
  if (!activity) return { error: "Choisissez une activité valide" };

  const isChange = !!user.business.activityKey;
  if (isChange) {
    const allowed = await hasPermission(user.businessId, user.role, PERMISSIONS.SETTINGS_MANAGE, user.id);
    if (!allowed) return { error: "Seul un administrateur peut modifier l'activité du commerce" };
  }

  const { error: updateError } = await supabase
    .from("businesses")
    .update({ activity_key: activity.key, activity: activity.label })
    .eq("id", user.businessId);

  if (updateError) {
    console.error("[setBusinessActivityAction] Échec mise à jour du commerce :", updateError.message);
    return { error: "Impossible d'enregistrer l'activité. Réessayez." };
  }

  const config = await getActivityConfig(activity.key);
  if (config.defaultCategories.length > 0) {
    const { data: existing } = await supabase
      .from("categories")
      .select("name")
      .eq("business_id", user.businessId)
      .in("name", config.defaultCategories);
    const existingNames = new Set((existing ?? []).map((c) => c.name as string));
    const toCreate = config.defaultCategories.filter((name) => !existingNames.has(name));
    if (toCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("categories")
        .insert(toCreate.map((name) => ({ business_id: user.businessId, name })));
      if (insertError) {
        console.error("[setBusinessActivityAction] Échec création des catégories :", insertError.message);
      }
    }
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: isChange ? "UPDATE" : "CREATE",
    entity: "BusinessActivity",
    details: activity.label,
  });

  revalidatePath("/dashboard");
  revalidatePath("/parametres");
  revalidatePath("/categories");
  redirect("/dashboard");
}

"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { updateBusinessSettings, type BusinessSettingsPatch } from "@/lib/business-settings";

export async function updateBusinessSettingsAction(patch: BusinessSettingsPatch) {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const { error } = await updateBusinessSettings(user.businessId, patch);
  if (error) {
    console.error("[updateBusinessSettingsAction] Échec :", error.message);
    return { error: "Impossible d'enregistrer ce réglage" };
  }
  revalidatePath("/parametres");
  return { success: true };
}

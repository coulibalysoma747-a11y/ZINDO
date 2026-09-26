"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getBusinessSettings, updateBusinessSettings, type BusinessSettingsPatch } from "@/lib/business-settings";
import { isDebtExemptionEnabled } from "@/lib/debt-exemption";
import { supabase } from "@/lib/supabase";

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

/** Autorise (ou non) un client précis à acheter malgré sa dette — flag exception_dette_client. */
export async function setCustomerDebtExemptionAction(customerId: string, exempt: boolean) {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!(await isDebtExemptionEnabled(user.businessId))) return { error: "Fonctionnalité non disponible" };
  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!customer) return { error: "Client introuvable" };

  const current = (await getBusinessSettings(user.businessId)).debtBlockExemptCustomerIds;
  const next = exempt ? Array.from(new Set([...current, customerId])) : current.filter((id) => id !== customerId);
  const { error } = await updateBusinessSettings(user.businessId, { debtBlockExemptCustomerIds: next });
  if (error) {
    console.error("[setCustomerDebtExemptionAction] Échec :", error.message);
    return { error: "Impossible d'enregistrer ce réglage" };
  }
  revalidatePath(`/clients/${customerId}`);
  return { success: true };
}

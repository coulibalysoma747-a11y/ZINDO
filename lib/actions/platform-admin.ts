"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireFounder } from "@/lib/superadmin-auth";
import { logAdminAction } from "@/lib/admin-audit";

export type ActionState = { error?: string; success?: string } | undefined;

export async function updatePlatformConfigAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireFounder();

  const maintenanceMode = formData.get("maintenanceMode") === "on";
  const maintenanceMessage = String(formData.get("maintenanceMessage") ?? "").trim() || null;
  const announcementActive = formData.get("announcementActive") === "on";
  const announcementMessage = String(formData.get("announcementMessage") ?? "").trim() || null;
  const announcementTone = formData.get("announcementTone") === "warning" ? "warning" : "info";

  const { error } = await supabase.from("platform_config").upsert({
    id: 1,
    maintenance_mode: maintenanceMode,
    maintenance_message: maintenanceMessage,
    announcement_active: announcementActive,
    announcement_message: announcementMessage,
    announcement_tone: announcementTone,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[updatePlatformConfigAction] Échec de l'enregistrement :", error.message);
    return { error: "Impossible d'enregistrer les réglages" };
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "UPDATE",
    entity: "PlatformConfig",
    details: `Maintenance : ${maintenanceMode ? "activée" : "désactivée"} · Annonce : ${announcementActive ? "activée" : "désactivée"}`,
  });

  revalidatePath("/admin/plateforme");
  return { success: "Réglages enregistrés" };
}

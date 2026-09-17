import "server-only";
import { supabase } from "@/lib/supabase";

export type PlatformConfig = {
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  announcementActive: boolean;
  announcementMessage: string | null;
  announcementTone: "info" | "warning";
};

// Comportement inchangé si la table n'est pas encore migrée côté base :
// pas de maintenance, pas d'annonce, jamais de blocage par erreur.
const DEFAULT_CONFIG: PlatformConfig = {
  maintenanceMode: false,
  maintenanceMessage: null,
  announcementActive: false,
  announcementMessage: null,
  announcementTone: "info",
};

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const { data } = await supabase
    .from("platform_config")
    .select(
      "maintenanceMode:maintenance_mode, maintenanceMessage:maintenance_message, announcementActive:announcement_active, announcementMessage:announcement_message, announcementTone:announcement_tone"
    )
    .eq("id", 1)
    .maybeSingle();
  if (!data) return DEFAULT_CONFIG;
  return data as unknown as PlatformConfig;
}

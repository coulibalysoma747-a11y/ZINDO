import "server-only";
import { supabase } from "@/lib/supabase";
import { cache } from "react";

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

async function getPlatformConfigUncached(): Promise<PlatformConfig> {
  // Sur l'app Windows, appelé notamment depuis /login — donc potentiellement
  // avant toute connexion, alors qu'aucun accès Supabase n'est encore
  // possible (voir lib/supabase.ts resolveClient). On applique ici la même
  // philosophie "jamais de blocage par erreur" qu'au cas "table absente"
  // ci-dessous, plutôt que de laisser planter la page.
  try {
    const { data } = await supabase
      .from("platform_config")
      .select(
        "maintenanceMode:maintenance_mode, maintenanceMessage:maintenance_message, announcementActive:announcement_active, announcementMessage:announcement_message, announcementTone:announcement_tone"
      )
      .eq("id", 1)
      .maybeSingle();
    if (!data) return DEFAULT_CONFIG;
    return data as unknown as PlatformConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** Mémorisé le temps d'une requête : le layout et la page l'appellent tous les deux. */
export const getPlatformConfig = cache(getPlatformConfigUncached);

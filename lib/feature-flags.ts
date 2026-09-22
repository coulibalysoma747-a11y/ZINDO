import "server-only";
import { supabase } from "@/lib/supabase";

/**
 * Contrôle du déploiement progressif des nouvelles fonctionnalités : une
 * fonctionnalité inconnue de cette table (jamais enregistrée via
 * registerFeatureFlag) est considérée comme définitive/toujours active — ce
 * mécanisme ne concerne que les fonctionnalités volontairement enregistrées
 * comme "en cours de déploiement".
 *
 * Règle impérative : toute nouvelle fonctionnalité ajoutée à ZINDO doit être
 * enregistrée ici et rester désactivée pour tout le monde tant que le
 * propriétaire de la plateforme n'a pas explicitement demandé de l'activer
 * (globalement, pour un commerce précis, ou pour une boutique précise d'un
 * commerce multi-boutiques) depuis /admin/fonctionnalites.
 *
 * Priorité (la plus spécifique gagne) : dérogation par boutique (locationId)
 * > dérogation par commerce > activation globale > désactivé par défaut.
 */
export async function isFeatureEnabled(
  key: string,
  businessId: string,
  locationId?: string | null
): Promise<boolean> {
  const { data: flag } = await supabase
    .from("feature_flags")
    .select("id, enabledGlobally:enabled_globally")
    .eq("key", key)
    .maybeSingle();
  if (!flag) return true;

  if (locationId) {
    const { data: locationOverride } = await supabase
      .from("feature_flag_locations")
      .select("enabled")
      .eq("feature_flag_id", flag.id)
      .eq("location_id", locationId)
      .maybeSingle();
    if (locationOverride) return locationOverride.enabled;
  }

  if (flag.enabledGlobally) return true;

  const { data: override } = await supabase
    .from("feature_flag_businesses")
    .select("enabled")
    .eq("feature_flag_id", flag.id)
    .eq("business_id", businessId)
    .maybeSingle();
  return override?.enabled ?? false;
}

/**
 * Variante pour les fonctionnalités qui n'ont pas encore de businessId (ex. :
 * une étape avant la création du commerce) — ne regarde que l'activation
 * globale, les dérogations par commerce n'ayant pas de sens à ce stade.
 */
export async function isFeatureEnabledGlobally(key: string): Promise<boolean> {
  const { data: flag } = await supabase
    .from("feature_flags")
    .select("enabledGlobally:enabled_globally")
    .eq("key", key)
    .maybeSingle();
  if (!flag) return true;
  return Boolean(flag.enabledGlobally);
}

/**
 * À appeler (une fois, par ex. au moment d'introduire la fonctionnalité dans
 * le code) pour créer la fiche du flag s'il n'existe pas déjà — sans jamais
 * écraser un flag existant (et donc sans jamais réactiver par erreur quelque
 * chose que l'administrateur a délibérément laissé désactivé).
 */
export async function registerFeatureFlag(key: string, label: string, description?: string) {
  const { data: existing } = await supabase.from("feature_flags").select("id").eq("key", key).maybeSingle();
  if (existing) return;
  const { error } = await supabase.from("feature_flags").insert({ key, label, description: description ?? null });
  if (error) console.error("[registerFeatureFlag] Échec de la création :", error.message);
}

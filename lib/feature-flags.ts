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
 * > activation globale > dérogation par commerce précis > règle par activité
 * (feature_flag_activities — persistante : couvre aussi les commerces créés
 * après coup avec cette activité, contrairement à une simple activation en
 * masse ponctuelle) > désactivé par défaut.
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

  const { data: businessOverride } = await supabase
    .from("feature_flag_businesses")
    .select("enabled")
    .eq("feature_flag_id", flag.id)
    .eq("business_id", businessId)
    .maybeSingle();
  if (businessOverride) return businessOverride.enabled;

  const { data: business } = await supabase.from("businesses").select("activityKey:activity_key").eq("id", businessId).maybeSingle();
  if (business?.activityKey) {
    const { data: activityRule } = await supabase
      .from("feature_flag_activities")
      .select("enabled")
      .eq("feature_flag_id", flag.id)
      .eq("activity_key", business.activityKey)
      .maybeSingle();
    if (activityRule) return activityRule.enabled;
  }

  return false;
}

/**
 * Variante pour les fonctionnalités qui n'ont pas encore de businessId (ex. :
 * une étape avant la création du commerce) — ne regarde que l'activation
 * globale, les dérogations par commerce n'ayant pas de sens à ce stade.
 */
export async function isFeatureEnabledGlobally(key: string): Promise<boolean> {
  // Appelé notamment depuis /login et /inscription sur l'app Windows, donc
  // potentiellement avant toute connexion — à ce stade aucun accès Supabase
  // n'est possible depuis le desktop (voir lib/supabase.ts resolveClient).
  // Même position de repli que pour un flag jamais enregistré : on ne bloque
  // jamais une page publique faute de pouvoir vérifier un drapeau.
  try {
    const { data: flag } = await supabase
      .from("feature_flags")
      .select("enabledGlobally:enabled_globally")
      .eq("key", key)
      .maybeSingle();
    if (!flag) return true;
    return Boolean(flag.enabledGlobally);
  } catch {
    return true;
  }
}

/**
 * À appeler (une fois, par ex. au moment d'introduire la fonctionnalité dans
 * le code) pour créer la fiche du flag s'il n'existe pas déjà — sans jamais
 * écraser un flag existant (et donc sans jamais réactiver par erreur quelque
 * chose que l'administrateur a délibérément laissé désactivé).
 */
export async function registerFeatureFlag(key: string, label: string, description?: string) {
  // Appelé notamment depuis /login (ensureGoogleSignupFlagRegistered), donc
  // potentiellement avant toute connexion sur l'app Windows, où aucun accès
  // Supabase n'est encore possible (voir lib/supabase.ts resolveClient) —
  // ce bootstrap best-effort ne doit jamais faire planter une page publique ;
  // il finira par s'exécuter lors d'un appel authentifié (web, ou desktop
  // après connexion).
  try {
    const { data: existing } = await supabase.from("feature_flags").select("id").eq("key", key).maybeSingle();
    if (existing) return;
    const { error } = await supabase.from("feature_flags").insert({ key, label, description: description ?? null });
    if (error) console.error("[registerFeatureFlag] Échec de la création :", error.message);
  } catch (e) {
    console.error("[registerFeatureFlag] Accès Supabase indisponible :", e instanceof Error ? e.message : e);
  }
}

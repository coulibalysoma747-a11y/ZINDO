import "server-only";
import { FEATURE_CATALOG } from "@/lib/subscription-features";

export { FEATURE_CATALOG } from "@/lib/subscription-features";

export type BusinessLimits = {
  planKey: string | null;
  planLabel: string | null;
  maxProducts: number | null;
  maxUsers: number | null;
  maxLocations: number | null;
  features: string[];
};

// Aucun palier assigné = aucune restriction (comportement identique à avant
// cette fonctionnalité). N'affecte que les commerces explicitement rattachés
// à un palier via l'inscription ou la console admin.
const UNRESTRICTED: BusinessLimits = {
  planKey: null,
  planLabel: null,
  maxProducts: null,
  maxUsers: null,
  maxLocations: null,
  features: FEATURE_CATALOG.map((f) => f.key),
};

/**
 * Paywall désactivé : ZINDO est entièrement gratuit et illimité pour tous
 * les commerces, quel que soit le palier auquel ils sont rattachés en base
 * — décision explicite du propriétaire de la plateforme. Les tables
 * subscription_plans/business_subscriptions et la page /abonnement restent
 * en place (facturation, historique) mais ne bloquent plus rien ; réactiver
 * l'application des limites se ferait ici en restaurant la lecture du plan
 * ci-dessous.
 */
export async function getBusinessLimits(_businessId: string): Promise<BusinessLimits> {
  return UNRESTRICTED;
}

export async function hasPlanFeature(businessId: string, featureKey: string): Promise<boolean> {
  const limits = await getBusinessLimits(businessId);
  return limits.features.includes(featureKey);
}

export async function checkLimit(
  _businessId: string,
  _kind: "products" | "users" | "locations"
): Promise<{ ok: boolean; limit: number | null; current: number }> {
  return { ok: true, limit: null, current: 0 };
}

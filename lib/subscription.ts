import "server-only";
import { supabase } from "@/lib/supabase";
import { FEATURE_CATALOG } from "@/lib/subscription-features";
import type { SubscriptionStatus, BillingCycle } from "@/lib/db-types";

export { FEATURE_CATALOG } from "@/lib/subscription-features";

const TRIAL_DURATION_DAYS = 7;
export const ACTIVE_PLAN_KEY = "pro";

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

// ---------------------------------------------------------------------------
// Essai gratuit de 7 jours puis abonnement payant obligatoire (7 500
// FCFA/mois ou 75 000 FCFA/an, sans palier gratuit) — indépendant des
// limites par fonctionnalité ci-dessus (désactivées) : ici on ne contrôle que
// l'ACCÈS à l'application, pas le nombre de produits/utilisateurs/boutiques.
// ---------------------------------------------------------------------------

export type SubscriptionState = {
  status: SubscriptionStatus | "NONE";
  planKey: string | null;
  planLabel: string | null;
  billingCycle: BillingCycle | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  trialDaysLeft: number | null;
  periodDaysLeft: number | null;
  /** true = l'accès à l'application doit être bloqué (essai ou période payée expirés sans paiement confirmé). */
  blocked: boolean;
};

type SubscriptionRow = {
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  plan: { key: string; label: string } | null;
};

async function loadSubscriptionRow(businessId: string): Promise<SubscriptionRow | null> {
  const { data } = await supabase
    .from("business_subscriptions")
    .select(
      "status, billingCycle:billing_cycle, trialEndsAt:trial_ends_at, currentPeriodEnd:current_period_end, plan:subscription_plans(key, label)"
    )
    .eq("business_id", businessId)
    .maybeSingle();
  return (data as unknown as SubscriptionRow) ?? null;
}

/**
 * Filet de sécurité : un commerce sans ligne business_subscriptions (créé
 * avant cette fonctionnalité, migration de rattrapage pas encore exécutée,
 * ou palier "standard" pas encore configuré en base) démarre son essai de 7
 * jours à la première visite au lieu d'être bloqué par erreur — même logique
 * défensive que le fallback colonne-manquante d'insertSaleItems.
 */
async function ensureSubscriptionRow(businessId: string): Promise<SubscriptionRow | null> {
  const existing = await loadSubscriptionRow(businessId);
  if (existing) return existing;

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("id, key, label")
    .eq("key", ACTIVE_PLAN_KEY)
    .maybeSingle();
  if (!plan) return null; // Palier pas encore configuré en base : pas de blocage tant que ce n'est pas prêt.

  const trialEndsAt = new Date(Date.now() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("business_subscriptions").insert({
    business_id: businessId,
    plan_id: plan.id,
    billing_cycle: "MONTHLY",
    status: "TRIAL",
    trial_ends_at: trialEndsAt,
  });
  if (error) {
    console.error("[ensureSubscriptionRow] Échec de la création de l'essai gratuit :", error.message);
    return null;
  }
  return {
    status: "TRIAL",
    billingCycle: "MONTHLY",
    trialEndsAt,
    currentPeriodEnd: null,
    plan: { key: plan.key as string, label: plan.label as string },
  };
}

export async function getSubscriptionState(businessId: string): Promise<SubscriptionState> {
  const row = await ensureSubscriptionRow(businessId);
  if (!row) {
    return {
      status: "NONE",
      planKey: null,
      planLabel: null,
      billingCycle: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
      trialDaysLeft: null,
      periodDaysLeft: null,
      blocked: false,
    };
  }

  const now = Date.now();
  let status: SubscriptionStatus = row.status;
  if (status === "TRIAL" && row.trialEndsAt && new Date(row.trialEndsAt).getTime() <= now) status = "EXPIRED";
  if (status === "ACTIVE" && row.currentPeriodEnd && new Date(row.currentPeriodEnd).getTime() <= now) status = "PAST_DUE";

  const trialDaysLeft =
    row.status === "TRIAL" && row.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(row.trialEndsAt).getTime() - now) / (24 * 60 * 60 * 1000)))
      : null;
  const periodDaysLeft =
    status === "ACTIVE" && row.currentPeriodEnd
      ? Math.max(0, Math.ceil((new Date(row.currentPeriodEnd).getTime() - now) / (24 * 60 * 60 * 1000)))
      : null;

  return {
    status,
    planKey: row.plan?.key ?? null,
    planLabel: row.plan?.label ?? null,
    billingCycle: row.billingCycle,
    trialEndsAt: row.trialEndsAt,
    currentPeriodEnd: row.currentPeriodEnd,
    trialDaysLeft,
    periodDaysLeft,
    blocked: status === "EXPIRED" || status === "PAST_DUE",
  };
}

export async function isSubscriptionBlocked(businessId: string): Promise<boolean> {
  const state = await getSubscriptionState(businessId);
  return state.blocked;
}

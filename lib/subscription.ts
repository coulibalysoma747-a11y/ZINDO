import "server-only";
import { supabase } from "@/lib/supabase";
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

function safeParseFeatures(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getBusinessLimits(businessId: string): Promise<BusinessLimits> {
  const { data: subscription } = await supabase
    .from("business_subscriptions")
    .select(
      "plan:subscription_plans(key, label, maxProducts:max_products, maxUsers:max_users, maxLocations:max_locations, features)"
    )
    .eq("business_id", businessId)
    .maybeSingle();
  const plan = subscription?.plan as unknown as
    | { key: string; label: string; maxProducts: number | null; maxUsers: number | null; maxLocations: number | null; features: string }
    | null;
  if (!plan) return UNRESTRICTED;

  return {
    planKey: plan.key,
    planLabel: plan.label,
    maxProducts: plan.maxProducts,
    maxUsers: plan.maxUsers,
    maxLocations: plan.maxLocations,
    features: safeParseFeatures(plan.features),
  };
}

export async function hasPlanFeature(businessId: string, featureKey: string): Promise<boolean> {
  const limits = await getBusinessLimits(businessId);
  return limits.features.includes(featureKey);
}

export async function checkLimit(
  businessId: string,
  kind: "products" | "users" | "locations"
): Promise<{ ok: boolean; limit: number | null; current: number }> {
  const limits = await getBusinessLimits(businessId);
  const max = kind === "products" ? limits.maxProducts : kind === "users" ? limits.maxUsers : limits.maxLocations;

  if (max === null) return { ok: true, limit: null, current: 0 };

  const table = kind === "products" ? "products" : kind === "users" ? "users" : "locations";
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("active", true);
  const current = count ?? 0;

  return { ok: current < max, limit: max, current };
}

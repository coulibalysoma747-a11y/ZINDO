import "server-only";
import { supabase } from "@/lib/supabase";
import { PLAN_DEFINITIONS, type PlanKey } from "@/lib/plans";

export type PlanOffer = {
  key: PlanKey;
  label: string;
  monthlyPrice: number;
  annualPrice: number;
  maxProducts: number | null;
  maxUsers: number | null;
  maxLocations: number | null;
  features: string[];
};

const FALLBACK_OFFERS = Object.values(PLAN_DEFINITIONS).map((plan) => ({
  ...plan,
  features: [...plan.features],
}));

/** Read the same database prices used to create subscription invoices. */
export async function getPlanOffers(): Promise<PlanOffer[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("key, label, monthlyPrice:monthly_price, annualPrice:annual_price, maxProducts:max_products, maxUsers:max_users, maxLocations:max_locations, features, order")
    .in("key", Object.keys(PLAN_DEFINITIONS))
    .order("order", { ascending: true });

  if (error || !data?.length) return FALLBACK_OFFERS;

  const offers = (data as Array<Record<string, unknown>>).flatMap((row): PlanOffer[] => {
    if (typeof row.key !== "string" || !Object.hasOwn(PLAN_DEFINITIONS, row.key)) return [];
    const key = row.key as PlanKey;
    const fallback = PLAN_DEFINITIONS[key];
    let features = [...fallback.features];
    if (typeof row.features === "string") {
      try {
        const parsed: unknown = JSON.parse(row.features);
        if (Array.isArray(parsed) && parsed.every((feature) => typeof feature === "string")) features = parsed;
      } catch {
        // Keep the checked-in feature list when the database value is malformed.
      }
    }
    return [{
      key,
      label: typeof row.label === "string" ? row.label : fallback.label,
      monthlyPrice: typeof row.monthlyPrice === "number" ? row.monthlyPrice : fallback.monthlyPrice,
      annualPrice: typeof row.annualPrice === "number" ? row.annualPrice : fallback.annualPrice,
      maxProducts: typeof row.maxProducts === "number" || row.maxProducts === null ? row.maxProducts : fallback.maxProducts,
      maxUsers: typeof row.maxUsers === "number" || row.maxUsers === null ? row.maxUsers : fallback.maxUsers,
      maxLocations: typeof row.maxLocations === "number" || row.maxLocations === null ? row.maxLocations : fallback.maxLocations,
      features,
    }];
  });

  if (!offers.length) return FALLBACK_OFFERS;
  const byKey = new Map(offers.map((offer) => [offer.key, offer]));
  return FALLBACK_OFFERS.map((fallback) => byKey.get(fallback.key) ?? fallback);
}

export function formatPlanLimit(value: number | null, unlimited = "illimités") {
  return value === null ? unlimited : value.toLocaleString("fr-FR");
}

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

const PUBLIC_OFFER_KEYS: PlanKey[] = ["pro"];

/** One public offer with one monthly and one annual billing cycle. */
export async function getPlanOffers(): Promise<PlanOffer[]> {
  const fallback = PUBLIC_OFFER_KEYS.map((key) => ({
    ...PLAN_DEFINITIONS[key],
    features: [...PLAN_DEFINITIONS[key].features],
  }));
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("key, label, monthlyPrice:monthly_price, annualPrice:annual_price, maxProducts:max_products, maxUsers:max_users, maxLocations:max_locations, features")
    .eq("key", "pro")
    .maybeSingle();
  if (error || !data) return fallback;

  const base = PLAN_DEFINITIONS.pro;
  let features: string[] = [...base.features];
  if (typeof data.features === "string") {
    try {
      const parsed: unknown = JSON.parse(data.features);
      if (Array.isArray(parsed) && parsed.every((feature) => typeof feature === "string")) features = parsed;
    } catch {
      // Use the reviewed feature list when the database value is malformed.
    }
  }
  return [{
    key: "pro",
    label: typeof data.label === "string" ? data.label : base.label,
    monthlyPrice: typeof data.monthlyPrice === "number" ? data.monthlyPrice : base.monthlyPrice,
    annualPrice: typeof data.annualPrice === "number" ? data.annualPrice : base.annualPrice,
    maxProducts: typeof data.maxProducts === "number" || data.maxProducts === null ? data.maxProducts : base.maxProducts,
    maxUsers: typeof data.maxUsers === "number" || data.maxUsers === null ? data.maxUsers : base.maxUsers,
    maxLocations: typeof data.maxLocations === "number" || data.maxLocations === null ? data.maxLocations : base.maxLocations,
    features,
  }];
}

export function formatPlanLimit(value: number | null, unlimited = "illimités") {
  return value === null ? unlimited : value.toLocaleString("fr-FR");
}

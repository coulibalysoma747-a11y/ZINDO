/** Public offer definitions shared by billing, limits and pricing pages. */
export const PLAN_DEFINITIONS = {
  free: {
    key: "free",
    label: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    maxProducts: 50,
    maxUsers: 1,
    maxLocations: 1,
    features: ["stock", "pos", "clients", "suppliers", "tickets", "basic_reports"],
  },
  starter: {
    key: "starter",
    label: "Starter",
    monthlyPrice: 5_000,
    annualPrice: 0,
    maxProducts: 500,
    maxUsers: 3,
    maxLocations: 1,
    features: [
      "stock", "pos", "clients", "suppliers", "tickets", "basic_reports",
      "advanced_stock", "inventory", "expenses", "credits", "promotions",
      "advanced_reports", "auto_backup", "deliveries",
    ],
  },
  pro: {
    key: "pro",
    label: "Entreprise",
    monthlyPrice: 7_500,
    annualPrice: 75_000,
    maxProducts: null,
    maxUsers: 10,
    maxLocations: 5,
    features: [
      "stock", "pos", "clients", "suppliers", "tickets", "basic_reports",
      "advanced_stock", "inventory", "expenses", "credits", "promotions",
      "advanced_reports", "auto_backup", "advanced_stats", "assistant_ia",
      "boutique_en_ligne", "deliveries", "smart_analysis", "advanced_backups",
      "priority_support_active", "advanced_permissions", "centralized_control",
      "consolidated_reports", "api_access", "priority_support",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLAN_DEFINITIONS;
export type BillingPlanKey = Exclude<PlanKey, "free">;

export function isPlanKey(value: string): value is PlanKey {
  return Object.hasOwn(PLAN_DEFINITIONS, value);
}

export function getPlanFeatures(key: string): string[] {
  // Unknown keys must never inherit the most privileged plan's features.
  return isPlanKey(key) ? [...PLAN_DEFINITIONS[key].features] : [];
}

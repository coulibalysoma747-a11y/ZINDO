import "server-only";
import { prisma } from "@/lib/prisma";
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
  const subscription = await prisma.businessSubscription.findUnique({
    where: { businessId },
    include: { plan: true },
  });
  if (!subscription) return UNRESTRICTED;

  return {
    planKey: subscription.plan.key,
    planLabel: subscription.plan.label,
    maxProducts: subscription.plan.maxProducts,
    maxUsers: subscription.plan.maxUsers,
    maxLocations: subscription.plan.maxLocations,
    features: safeParseFeatures(subscription.plan.features),
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

  const current =
    kind === "products"
      ? await prisma.product.count({ where: { businessId, active: true } })
      : kind === "users"
        ? await prisma.user.count({ where: { businessId, active: true } })
        : await prisma.location.count({ where: { businessId, active: true } });

  return { ok: current < max, limit: max, current };
}

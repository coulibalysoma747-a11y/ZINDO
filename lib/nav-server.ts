import "server-only";
import { NAV_ITEMS, type NavItem } from "@/lib/nav";
import { hasPermission } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getActivityConfig, resolveTerm, TERM_NAV_HREF, type TermKey } from "@/lib/activity-config";
import { getBusinessLimits } from "@/lib/subscription";
import type { Role } from "@prisma/client";

const HREF_TO_TERM: Record<string, TermKey> = Object.fromEntries(
  Object.entries(TERM_NAV_HREF).map(([term, href]) => [href, term as TermKey])
);

export async function getVisibleNavItems(
  businessId: string,
  role: Role,
  userId: string,
  activityKey?: string | null
): Promise<NavItem[]> {
  const [activityConfig, planLimits] = await Promise.all([
    getActivityConfig(activityKey),
    getBusinessLimits(businessId),
  ]);

  const checked = await Promise.all(
    NAV_ITEMS.map(async (item) => {
      const [permissionOk, featureOk] = await Promise.all([
        item.permission ? hasPermission(businessId, role, item.permission, userId) : true,
        item.featureFlag ? isFeatureEnabled(item.featureFlag, businessId) : true,
      ]);
      const planOk = item.planFeature ? planLimits.features.includes(item.planFeature) : true;
      const hiddenByActivity = activityConfig.hiddenNavHrefs.includes(item.href);
      return { item, allowed: permissionOk && featureOk && planOk && !hiddenByActivity };
    })
  );

  return checked
    .filter((c) => c.allowed)
    .map((c) => {
      const term = HREF_TO_TERM[c.item.href];
      if (!term) return c.item;
      return { ...c.item, label: resolveTerm(activityConfig, term) };
    });
}

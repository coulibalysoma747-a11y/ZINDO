import "server-only";
import { MARKET_EXCLUDED_ACTIVITIES, MARKET_ONLY_ACTIVITY_KEY, MARKET_ONLY_NAV_HREFS } from "@/lib/market";
import { NAV_ITEMS, type NavItem } from "@/lib/nav";
import { hasPermission } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getActivityConfig, resolveTerm, TERM_NAV_HREF, type TermKey } from "@/lib/activity-config";
import { getBusinessLimits } from "@/lib/subscription";
import { getBusinessSettings } from "@/lib/business-settings";
import type { Role } from "@/lib/db-types";

const HREF_TO_TERM: Record<string, TermKey> = Object.fromEntries(
  Object.entries(TERM_NAV_HREF).map(([term, href]) => [href, term as TermKey])
);

function matchesRequiredActivity(item: NavItem, activityKey?: string | null): boolean {
  if (!item.requireActivity) return true;
  const allowed = Array.isArray(item.requireActivity) ? item.requireActivity : [item.requireActivity];
  return !!activityKey && allowed.includes(activityKey);
}

export type ModuleUnavailableReason = "permission" | "feature" | "plan" | "activity" | "module";
export type ModuleAvailability = { allowed: boolean; reason: ModuleUnavailableReason | null };

/**
 * Disponibilité de CHAQUE module (pas seulement ceux visibles dans le menu)
 * pour ce compte, avec la raison si indisponible — utilisé par le guide des
 * modules de la page Aide pour ne jamais proposer d'aller sur une page à
 * laquelle le compte n'a pas accès (permission de rôle, fonctionnalité
 * désactivée, formule d'abonnement, ou type d'activité).
 */
export async function getNavItemsAvailability(
  businessId: string,
  role: Role,
  userId: string,
  activityKey?: string | null,
  locationId?: string | null
): Promise<Record<string, ModuleAvailability>> {
  const [activityConfig, planLimits, businessSettings] = await Promise.all([
    getActivityConfig(activityKey),
    getBusinessLimits(businessId),
    getBusinessSettings(businessId),
  ]);

  const entries = await Promise.all(
    NAV_ITEMS.map(async (item) => {
      const [permissionOk, featureOk] = await Promise.all([
        item.permission ? hasPermission(businessId, role, item.permission, userId) : true,
        item.featureFlag ? isFeatureEnabled(item.featureFlag, businessId, locationId) : true,
      ]);
      const planOk = item.planFeature ? planLimits.features.includes(item.planFeature) : true;
      const moduleOk = item.moduleToggle ? businessSettings.modulesEnabled[item.moduleToggle] : true;
      const hiddenByActivity =
        // Le « Vendeur du Marché » suit sa propre liste blanche (MARKET_ONLY_NAV_HREFS) : la liste de modules cachés de l'activité ne s'applique pas.
        (activityKey !== MARKET_ONLY_ACTIVITY_KEY && activityConfig.hiddenNavHrefs.includes(item.href)) ||
        !matchesRequiredActivity(item, activityKey) ||
        // Activités exclues du Marché (école) : pas de « Mon Marché ».
        (item.href === "/mon-marche" && !!activityKey && MARKET_EXCLUDED_ACTIVITIES.includes(activityKey)) ||
        (activityKey === MARKET_ONLY_ACTIVITY_KEY && !MARKET_ONLY_NAV_HREFS.includes(item.href));

      let reason: ModuleUnavailableReason | null = null;
      if (!permissionOk) reason = "permission";
      else if (!featureOk) reason = "feature";
      else if (!planOk) reason = "plan";
      else if (!moduleOk) reason = "module";
      else if (hiddenByActivity) reason = "activity";

      return [item.href, { allowed: reason === null, reason }] as const;
    })
  );

  return Object.fromEntries(entries);
}

export async function getVisibleNavItems(
  businessId: string,
  role: Role,
  userId: string,
  activityKey?: string | null,
  locationId?: string | null
): Promise<NavItem[]> {
  const [activityConfig, planLimits, businessSettings] = await Promise.all([
    getActivityConfig(activityKey),
    getBusinessLimits(businessId),
    getBusinessSettings(businessId),
  ]);

  const checked = await Promise.all(
    NAV_ITEMS.map(async (item) => {
      const [permissionOk, featureOk] = await Promise.all([
        item.permission ? hasPermission(businessId, role, item.permission, userId) : true,
        item.featureFlag ? isFeatureEnabled(item.featureFlag, businessId, locationId) : true,
      ]);
      const planOk = item.planFeature ? planLimits.features.includes(item.planFeature) : true;
      const moduleOk = item.moduleToggle ? businessSettings.modulesEnabled[item.moduleToggle] : true;
      const hiddenByActivity =
        // Le « Vendeur du Marché » suit sa propre liste blanche (MARKET_ONLY_NAV_HREFS) : la liste de modules cachés de l'activité ne s'applique pas.
        (activityKey !== MARKET_ONLY_ACTIVITY_KEY && activityConfig.hiddenNavHrefs.includes(item.href)) ||
        !matchesRequiredActivity(item, activityKey) ||
        // Activités exclues du Marché (école) : pas de « Mon Marché ».
        (item.href === "/mon-marche" && !!activityKey && MARKET_EXCLUDED_ACTIVITIES.includes(activityKey)) ||
        // « Vendeur du Marché » : seulement ce qui le regarde.
        (activityKey === MARKET_ONLY_ACTIVITY_KEY && !MARKET_ONLY_NAV_HREFS.includes(item.href));
      return { item, allowed: permissionOk && featureOk && planOk && moduleOk && !hiddenByActivity };
    })
  );

  const visible = checked
    .filter((c) => c.allowed)
    .map((c) => {
      const term = HREF_TO_TERM[c.item.href];
      if (!term) return c.item;
      return { ...c.item, label: resolveTerm(activityConfig, term) };
    });

  // « Vendeur du Marché » : menu court dans un ordre fixe ; « Produits » ouvre la liste de ses produits du Marché.
  if (activityKey === MARKET_ONLY_ACTIVITY_KEY) {
    const order = ["/mon-marche", "/mon-marche/produits", "/mon-marche/visibilite", "/verification", "/parametres", "/support"];
    return visible
      .map((item): NavItem => {
        if (item.href === "/produits") return { ...item, href: "/mon-marche/produits", activeMatch: ["/mon-marche/produits", "/produits"] };
        if (item.href === "/mon-marche") return { ...item, activeExclude: ["/mon-marche/produits", "/mon-marche/visibilite"] };
        return item;
      })
      .sort((a, b) => order.indexOf(a.href) - order.indexOf(b.href));
  }
  return visible;
}

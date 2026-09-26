import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUserForBilling, hasPermission } from "@/lib/auth";
import { getVisibleNavItems } from "@/lib/nav-server";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { isSubscriptionBlocked } from "@/lib/subscription";
import { getAdminSession } from "@/lib/adminSession";
import { getPlatformConfig } from "@/lib/platform-config";
import { getBusinessSettings } from "@/lib/business-settings";
import { isGlobalSearchEnabled } from "@/lib/global-search";
import { isMenuSearchEnabled } from "@/lib/menu-search";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { HasPhysicalStoreBanner } from "@/components/layout/HasPhysicalStoreBanner";
import { ROLE_LABELS, PERMISSIONS } from "@/lib/permissions";
import { ensureDesktopOfflineFlagRegistered } from "@/lib/actions/desktop-offline";
import { isBrowserOfflineEnabled } from "@/lib/actions/browser-offline";
import { OfflineShell } from "@/components/layout/OfflineShell";
import { ensurePurchaseOrdersFlagRegistered } from "@/lib/actions/purchase-orders";
import { ensureReferralFlagRegistered } from "@/lib/referral";
import { MARKET_SELLER_HOME, isMarketSeller, isPathAllowedForMarketSeller } from "@/lib/market-seller";
import { MarketSellerShell } from "@/components/layout/MarketSellerShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserForBilling();

  // Enregistrement paresseux, sans attendre le résultat (idempotent, ne doit
  // pas ajouter de latence à chaque page) — voir lib/actions/desktop-offline.ts.
  void ensureDesktopOfflineFlagRegistered();
  // Tout est lancé en même temps plutôt que l'un après l'autre : chaque
  // attente coûte un aller-retour vers Supabase, et ces lectures ne dépendent
  // pas les unes des autres. Les flags enregistrés ici sont attendus : ils
  // conditionnent des entrées du menu, et un flag jamais enregistré serait
  // considéré comme activé (voir lib/feature-flags.ts).
  const [, adminSession, platformConfig, subscriptionBlocked, businessSettings, marketSeller, locations, currentLocation, requestHeaders] =
    await Promise.all([
      Promise.all([ensurePurchaseOrdersFlagRegistered(), ensureReferralFlagRegistered()]),
      getAdminSession(),
      getPlatformConfig(),
      isSubscriptionBlocked(user.businessId),
      getBusinessSettings(user.businessId),
      isMarketSeller(user.businessId),
      getLocations(user.businessId),
      getCurrentLocation(user.businessId),
      headers(),
    ]);

  // Un Fondateur "en tant que" ce commerçant (voir lib/actions/impersonation.ts)
  // garde son cookie admin en plus du cookie commerçant — sa présence indique
  // une usurpation active, qui doit pouvoir contourner le mode maintenance et
  // le blocage d'abonnement (c'est justement pour déboguer ces cas-là).
  const isImpersonating = !!adminSession;

  const pathname = requestHeaders.get("x-zindo-pathname") ?? "";
  const isBillingPage = pathname === "/abonnement" || pathname.startsWith("/abonnement/");

  if (!isImpersonating && platformConfig.maintenanceMode) redirect("/maintenance");
  // /abonnement doit rester accessible même en cas de blocage (essai expiré,
  // impayé) — sans quoi ce serait la seule page permettant de régler le
  // problème qui se retrouverait elle-même redirigée vers elle-même.
  if (!isImpersonating && !isBillingPage && subscriptionBlocked) redirect("/abonnement");

  // Vendeur du Marché sans boutique : espace vendeur uniquement, jamais
  // l'application complète (caisse, stock, rapports…), même par URL directe.
  if (marketSeller) {
    if (pathname && !isPathAllowedForMarketSeller(pathname)) redirect(MARKET_SELLER_HOME);
    return <MarketSellerShell sellerName={user.business.name}>{children}</MarketSellerShell>;
  }

  const [navItems, canSell, canManageProducts, canManageStock, canManagePurchases, offlineEnabled, globalSearchEnabled, menuSearchEnabled] = await Promise.all([
    getVisibleNavItems(user.businessId, user.role, user.id, user.business.activityKey, currentLocation?.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.SALES_CREATE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.PRODUCTS_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.STOCK_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.PURCHASES_MANAGE, user.id),
    isBrowserOfflineEnabled(user.businessId),
    isGlobalSearchEnabled(user.businessId),
    isMenuSearchEnabled(user.businessId),
  ]);

  // Menu latéral fermé par l'utilisateur (voir components/layout/SidebarToggle.tsx).
  const sidebarClosed = (await cookies()).get("zindo_sidebar")?.value === "closed";

  return (
    <div
      id="zindo-app-shell"
      data-sidebar={sidebarClosed ? "closed" : "open"}
      className="group/app flex min-h-screen bg-(--app-canvas) print:block print:min-h-0 print:bg-white"
    >
      <div className="print:hidden group-data-[sidebar=closed]/app:hidden">
        <Sidebar
          businessName={user.business.name}
          items={navItems}
          menuSearch={menuSearchEnabled}
          userName={`${user.firstName} ${user.lastName}`}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col print:block">
        <div className="print:hidden">
          {isImpersonating && (
            <ImpersonationBanner businessName={user.business.name} userName={`${user.firstName} ${user.lastName}`} />
          )}
          {platformConfig.announcementActive && platformConfig.announcementMessage && (
            <AnnouncementBanner message={platformConfig.announcementMessage} tone={platformConfig.announcementTone} />
          )}
          {businessSettings.hasPhysicalStore === null && user.role === "ADMIN" && <HasPhysicalStoreBanner />}
          <Topbar
            userName={`${user.firstName} ${user.lastName}`}
            role={ROLE_LABELS[user.role]}
            navItems={navItems}
            businessName={user.business.name}
            locations={locations}
            currentLocationId={currentLocation?.id ?? ""}
            globalSearchCurrency={globalSearchEnabled ? user.business.currency : null}
            menuSearch={menuSearchEnabled}
          />
        </div>
        <main className="flex-1 overflow-y-auto p-4 pb-28 sm:pb-6 md:p-6 lg:p-8 print:overflow-visible print:p-0">{children}</main>
      </div>
      <OfflineShell enabled={offlineEnabled} userId={user.id} />
      <div className="print:hidden">
        <MobileTabBar
          navItems={navItems}
          canSell={canSell}
          canManageProducts={canManageProducts}
          canManageStock={canManageStock}
          canManagePurchases={canManagePurchases}
        />
      </div>
    </div>
  );
}

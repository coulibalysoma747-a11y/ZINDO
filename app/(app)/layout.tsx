import { cookies, headers } from "next/headers";
import { isFeatureEnabled } from "@/lib/feature-flags";
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
import { isSalesHubEnabled } from "@/lib/sales-hub";
import { isFourTabBarEnabled } from "@/lib/bottom-bar";
import { isPosPhoneEnabled } from "@/lib/pos-phone";
import { isSelectOnFocusEnabled } from "@/lib/select-on-focus";
import { SelectOnFocus } from "@/components/layout/SelectOnFocus";
import { MobileTabBarFour } from "@/components/layout/MobileTabBarFour";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { HasPhysicalStoreBanner } from "@/components/layout/HasPhysicalStoreBanner";
import { roleLabels, PERMISSIONS } from "@/lib/permissions";
import { ensureDesktopOfflineFlagRegistered } from "@/lib/actions/desktop-offline";
import { isBrowserOfflineEnabled } from "@/lib/actions/browser-offline";
import { OfflineShell } from "@/components/layout/OfflineShell";
import { ensurePurchaseOrdersFlagRegistered } from "@/lib/actions/purchase-orders";
import { ensureReferralFlagRegistered } from "@/lib/referral";

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
  const [, adminSession, platformConfig, subscriptionBlocked, businessSettings, locations, currentLocation, requestHeaders] =
    await Promise.all([
      Promise.all([ensurePurchaseOrdersFlagRegistered(), ensureReferralFlagRegistered()]),
      getAdminSession(),
      getPlatformConfig(),
      isSubscriptionBlocked(user.businessId),
      getBusinessSettings(user.businessId),
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

  const [navItems, canSell, canManageProducts, canManageStock, canManagePurchases, offlineEnabled, globalSearchEnabled, menuSearchEnabled, salesHub, fourTabs, posPhone, selectOnFocus, interfacePro] = await Promise.all([
    getVisibleNavItems(user.businessId, user.role, user.id, user.business.activityKey, currentLocation?.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.SALES_CREATE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.PRODUCTS_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.STOCK_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.PURCHASES_MANAGE, user.id),
    isBrowserOfflineEnabled(user.businessId),
    isGlobalSearchEnabled(user.businessId),
    isMenuSearchEnabled(user.businessId),
    isSalesHubEnabled(user.businessId),
    isFourTabBarEnabled(user.businessId),
    isPosPhoneEnabled(user.businessId),
    isSelectOnFocusEnabled(user.businessId),
    isFeatureEnabled("interface_pro", user.businessId),
  ]);
  // Caisse plein écran sur téléphone (flag caisse_telephone) : ni en-tête, ni
  // bandeau, ni barre du bas sur la caisse et la facture A4 — la caisse a son
  // propre menu ⋮ avec « Quitter la caisse ».
  const posFullScreen = posPhone && (pathname === "/ventes" || pathname === "/factures" || pathname === "/factures/tableau");

  // Écran « Vente » (flag accueil_vente) : « Vente » y mène aussi sur
  // ordinateur, et la Facture A4 et l'historique des ventes, rangés dans cet
  // écran comme chez FasoStock, sortent du menu. navItems reste complet pour
  // les droits d'accès (barre du bas, écran Vente).
  const isSchool = user.business.activityKey === "ecole" && navItems.some((i) => i.href === "/ecole/tableau-de-bord");
  const baseMenu = salesHub
    ? navItems
        .filter((i) => i.href !== "/factures" && i.href !== "/ventes/historique")
        .map((i) => (i.href === "/ventes" ? { ...i, href: "/ventes/accueil", activeMatch: ["/ventes", "/factures"] } : i))
    : navItems;
  const menuItems = isSchool ? baseMenu.filter((i) => i.href !== "/dashboard") : baseMenu;

  // Menu latéral fermé par l'utilisateur (voir components/layout/SidebarToggle.tsx).
  const cookieStore = await cookies();
  const sidebarClosed = cookieStore.get("zindo_sidebar")?.value === "closed";
  const storeBannerHidden = cookieStore.get("zindo_hide_store_banner")?.value === "1";

  return (
    <div
      id="zindo-app-shell"
      data-sidebar={sidebarClosed ? "closed" : "open"}
      className="group/app flex min-h-screen bg-(--app-canvas) print:block print:min-h-0 print:bg-white"
    >
      <div className="print:hidden group-data-[sidebar=closed]/app:hidden">
        <Sidebar
          businessName={user.business.name}
          items={menuItems}
          menuSearch={menuSearchEnabled}
          dark={interfacePro}
          userName={`${user.firstName} ${user.lastName}`}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col print:block">
        <div className={posFullScreen ? "hidden md:block print:hidden" : "print:hidden"}>
          {isImpersonating && (
            <ImpersonationBanner businessName={user.business.name} userName={`${user.firstName} ${user.lastName}`} />
          )}
          {platformConfig.announcementActive && platformConfig.announcementMessage && (
            <AnnouncementBanner message={platformConfig.announcementMessage} tone={platformConfig.announcementTone} />
          )}
          {businessSettings.hasPhysicalStore === null && user.role === "ADMIN" && !storeBannerHidden && !isSchool && <HasPhysicalStoreBanner pro={interfacePro} />}
          <Topbar
            userName={`${user.firstName} ${user.lastName}`}
            role={roleLabels(user.business.activityKey)[user.role]}
            navItems={menuItems}
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
      {selectOnFocus && <SelectOnFocus />}
      <div className={posFullScreen ? "hidden" : "print:hidden"}>
        {fourTabs ? (
          <MobileTabBarFour
            navItems={navItems}
            menuItems={menuItems}
            canSell={canSell}
            canManageProducts={canManageProducts}
            canManageStock={canManageStock}
            canManagePurchases={canManagePurchases}
            salesHub={salesHub}
          />
        ) : (
          <MobileTabBar
            navItems={navItems}
            canSell={canSell}
            canManageProducts={canManageProducts}
            canManageStock={canManageStock}
            canManagePurchases={canManagePurchases}
            salesHub={salesHub}
          />
        )}
      </div>
    </div>
  );
}

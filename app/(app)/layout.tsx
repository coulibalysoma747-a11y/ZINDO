import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireUserForBilling, hasPermission } from "@/lib/auth";
import { getVisibleNavItems } from "@/lib/nav-server";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { isSubscriptionBlocked } from "@/lib/subscription";
import { getAdminSession } from "@/lib/adminSession";
import { getPlatformConfig } from "@/lib/platform-config";
import { getBusinessSettings } from "@/lib/business-settings";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { ImpersonationBanner } from "@/components/layout/ImpersonationBanner";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";
import { HasPhysicalStoreBanner } from "@/components/layout/HasPhysicalStoreBanner";
import { ROLE_LABELS, PERMISSIONS } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserForBilling();

  // Un Fondateur "en tant que" ce commerçant (voir lib/actions/impersonation.ts)
  // garde son cookie admin en plus du cookie commerçant — sa présence indique
  // une usurpation active, qui doit pouvoir contourner le mode maintenance et
  // le blocage d'abonnement (c'est justement pour déboguer ces cas-là).
  const isImpersonating = !!(await getAdminSession());

  const [platformConfig, subscriptionBlocked, businessSettings] = await Promise.all([
    getPlatformConfig(),
    isImpersonating ? Promise.resolve(false) : isSubscriptionBlocked(user.businessId),
    getBusinessSettings(user.businessId),
  ]);

  const pathname = (await headers()).get("x-zindo-pathname") ?? "";
  const isBillingPage = pathname === "/abonnement" || pathname.startsWith("/abonnement/");

  if (!isImpersonating && platformConfig.maintenanceMode) redirect("/maintenance");
  // /abonnement doit rester accessible même en cas de blocage (essai expiré,
  // impayé) — sans quoi ce serait la seule page permettant de régler le
  // problème qui se retrouverait elle-même redirigée vers elle-même.
  if (!isBillingPage && subscriptionBlocked) redirect("/abonnement");

  const [locations, currentLocation] = await Promise.all([getLocations(user.businessId), getCurrentLocation(user.businessId)]);

  const [navItems, canSell, canManageProducts, canManageStock, canManagePurchases] = await Promise.all([
    getVisibleNavItems(user.businessId, user.role, user.id, user.business.activityKey, currentLocation?.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.SALES_CREATE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.PRODUCTS_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.STOCK_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.PURCHASES_MANAGE, user.id),
  ]);

  return (
    <div className="flex min-h-screen bg-zinc-50 print:block print:min-h-0 print:bg-white">
      <div className="print:hidden">
        <Sidebar businessName={user.business.name} items={navItems} />
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
          />
        </div>
        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:pb-4 md:p-6 print:overflow-visible print:p-0">{children}</main>
        <div className="print:hidden">
          <AppFooter />
        </div>
      </div>
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

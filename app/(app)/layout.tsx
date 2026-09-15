import { requireUser, hasPermission } from "@/lib/auth";
import { getVisibleNavItems } from "@/lib/nav-server";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { ROLE_LABELS, PERMISSIONS } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [navItems, locations, currentLocation, canSell, canManageProducts, canManageStock, canManagePurchases] =
    await Promise.all([
      getVisibleNavItems(user.businessId, user.role, user.id, user.business.activityKey),
      getLocations(user.businessId),
      getCurrentLocation(user.businessId),
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

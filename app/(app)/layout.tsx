import { requireUser } from "@/lib/auth";
import { getVisibleNavItems } from "@/lib/nav-server";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { ROLE_LABELS } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [navItems, locations, currentLocation] = await Promise.all([
    getVisibleNavItems(user.businessId, user.role, user.id, user.business.activityKey),
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
  ]);

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar businessName={user.business.name} items={navItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={`${user.firstName} ${user.lastName}`}
          role={ROLE_LABELS[user.role]}
          navItems={navItems}
          businessName={user.business.name}
          locations={locations}
          currentLocationId={currentLocation?.id ?? ""}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}

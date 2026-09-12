import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { AdminSidebar } from "./AdminSidebar";
import { AdminMobileNav } from "./AdminMobileNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireSuperAdmin();

  return (
    <div className="theme-locked flex min-h-screen bg-slate-100">
      <AdminSidebar adminName={admin.name} role={admin.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileNav adminName={admin.name} role={admin.role} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

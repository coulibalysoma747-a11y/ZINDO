"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { superAdminLogoutAction } from "@/lib/actions/admin-auth";
import type { SuperAdminRole } from "@prisma/client";

const NAV_ITEMS = [
  { label: "Tableau de bord", href: "/admin", founderOnly: false },
  { label: "Utilisateurs", href: "/admin/utilisateurs", founderOnly: false },
  { label: "Commerçants", href: "/admin/commercants", founderOnly: false },
  { label: "Activités", href: "/admin/activites", founderOnly: false },
  { label: "Abonnements", href: "/admin/abonnements", founderOnly: true },
  { label: "Permissions", href: "/admin/permissions", founderOnly: false },
  { label: "Sécurité", href: "/admin/securite", founderOnly: true },
  { label: "Administrateurs", href: "/admin/administrateurs", founderOnly: true },
  { label: "Support", href: "/admin/support", founderOnly: false },
  { label: "Fonctionnalités", href: "/admin/fonctionnalites", founderOnly: false },
  { label: "Profil", href: "/admin/profil", founderOnly: false },
];

export function AdminMobileNav({ adminName, role }: { adminName: string; role: SuperAdminRole }) {
  const pathname = usePathname();
  const isFounder = role === "FOUNDER";
  const items = NAV_ITEMS.filter((item) => !item.founderOnly || isFounder);

  return (
    <div className="border-b border-slate-800 bg-slate-950 text-slate-300 md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold text-white">ZINDO Admin</span>
        <form action={superAdminLogoutAction}>
          <button type="submit" className="text-xs font-medium text-slate-400 hover:text-white">
            {adminName.split(" ")[0]} — Déconnexion
          </button>
        </form>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
                active ? "bg-zindo-green-500 text-white" : "bg-slate-900 text-slate-400"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

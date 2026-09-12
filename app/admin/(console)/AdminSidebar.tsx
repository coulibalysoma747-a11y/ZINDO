"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Users, KeyRound, UserCog, LogOut, ShieldCheck, Shield, Crown, LifeBuoy, FlaskConical, Palette, Wallet } from "lucide-react";
import { superAdminLogoutAction } from "@/lib/actions/admin-auth";
import type { SuperAdminRole } from "@prisma/client";

const NAV_ITEMS = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard, founderOnly: false },
  { label: "Utilisateurs", href: "/admin/utilisateurs", icon: Users, founderOnly: false },
  { label: "Commerçants", href: "/admin/commercants", icon: Store, founderOnly: false },
  { label: "Activités", href: "/admin/activites", icon: Palette, founderOnly: false },
  { label: "Abonnements & revenus", href: "/admin/abonnements", icon: Wallet, founderOnly: true },
  { label: "Permissions par défaut", href: "/admin/permissions", icon: KeyRound, founderOnly: false },
  { label: "Sécurité", href: "/admin/securite", icon: Shield, founderOnly: true },
  { label: "Administrateurs", href: "/admin/administrateurs", icon: ShieldCheck, founderOnly: true },
  { label: "Support", href: "/admin/support", icon: LifeBuoy, founderOnly: false },
  { label: "Fonctionnalités", href: "/admin/fonctionnalites", icon: FlaskConical, founderOnly: false },
  { label: "Mon profil", href: "/admin/profil", icon: UserCog, founderOnly: false },
];

export function AdminSidebar({ adminName, role }: { adminName: string; role: SuperAdminRole }) {
  const pathname = usePathname();
  const isFounder = role === "FOUNDER";
  const items = NAV_ITEMS.filter((item) => !item.founderOnly || isFounder);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-950 text-slate-300 md:flex">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-slate-800/80 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zindo-orange-500 text-xl font-black text-white shadow-lg shadow-zindo-orange-500/20">
            Z
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold tracking-wide text-white">ZINDO</h1>
            <span className="inline-block max-w-full truncate rounded-full bg-zindo-orange-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zindo-orange-400">
              Console administrateur
            </span>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-zindo-orange-500 text-white shadow-md shadow-zindo-orange-500/25"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${active ? "text-white" : "text-slate-400 group-hover:text-zindo-orange-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800/80 bg-slate-950/60 p-3">
        <div className="mb-2 px-2">
          {isFounder ? (
            <>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <Crown className="h-3.5 w-3.5" />
                <span className="truncate">{adminName}</span>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Créateur • Fondateur • Propriétaire
              </p>
            </>
          ) : (
            <p className="truncate text-xs text-slate-500">Connecté : {adminName}</p>
          )}
        </div>
        <form action={superAdminLogoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-100"
          >
            <LogOut className="h-4.5 w-4.5" />
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}

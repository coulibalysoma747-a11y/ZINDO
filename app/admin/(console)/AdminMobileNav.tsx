"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Gauge,
  Users,
  Store,
  HeartPulse,
  Palette,
  Wallet,
  KeyRound,
  Shield,
  ShieldCheck,
  LifeBuoy,
  FlaskConical,
  ShoppingBag,
  BadgeCheck,
  Gift,
  Settings2,
  UserCog,
  LogOut,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { superAdminLogoutAction } from "@/lib/actions/admin-auth";
import type { SuperAdminRole } from "@prisma/client";

const NAV_ITEMS = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard, founderOnly: false },
  { label: "Cockpit du fondateur", href: "/admin/cockpit", icon: Gauge, founderOnly: true },
  { label: "Utilisateurs", href: "/admin/utilisateurs", icon: Users, founderOnly: false },
  { label: "Commerçants", href: "/admin/commercants", icon: Store, founderOnly: false },
  { label: "Suivi des commerçants", href: "/admin/suivi", icon: HeartPulse, founderOnly: false },
  { label: "Activités", href: "/admin/activites", icon: Palette, founderOnly: false },
  { label: "Abonnements & revenus", href: "/admin/abonnements", icon: Wallet, founderOnly: true },
  { label: "Permissions par défaut", href: "/admin/permissions", icon: KeyRound, founderOnly: false },
  { label: "Sécurité", href: "/admin/securite", icon: Shield, founderOnly: true },
  { label: "Administrateurs", href: "/admin/administrateurs", icon: ShieldCheck, founderOnly: true },
  { label: "Support", href: "/admin/support", icon: LifeBuoy, founderOnly: false },
  { label: "Fonctionnalités", href: "/admin/fonctionnalites", icon: FlaskConical, founderOnly: false },
  { label: "Marché", href: "/admin/marche", icon: ShoppingBag, founderOnly: false },
  { label: "Vérifications Marché", href: "/admin/verifications", icon: BadgeCheck, founderOnly: false },
  { label: "Parrainages", href: "/admin/parrainages", icon: Gift, founderOnly: false },
  { label: "Plateforme", href: "/admin/plateforme", icon: Settings2, founderOnly: true },
  { label: "Mon profil", href: "/admin/profil", icon: UserCog, founderOnly: false },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}

export function AdminMobileNav({ adminName, role }: { adminName: string; role: SuperAdminRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isFounder = role === "FOUNDER";
  const items = NAV_ITEMS.filter((item) => !item.founderOnly || isFounder);

  return (
    <div className="border-b border-slate-800 bg-slate-950 text-slate-300 md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu des modules"
            aria-expanded={open}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-800/60 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="truncate text-sm font-bold text-white">ZINDO Admin</span>
        </div>
        <form action={superAdminLogoutAction}>
          <button type="submit" className="text-xs font-medium text-slate-400 hover:text-white">
            {adminName.split(" ")[0]} — Déconnexion
          </button>
        </form>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="animate-zindo-fade-in absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
          />
          <div className="absolute left-0 top-0 flex h-full w-[82%] max-w-80 flex-col bg-slate-950 text-slate-300 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zindo-blue-500 text-white">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">ZINDO</p>
                  <p className="truncate text-xs font-medium text-zindo-blue-400">Administration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-zindo-blue-500 text-white shadow-md shadow-zindo-blue-500/25"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4.5 w-4.5",
                          active ? "text-white" : "text-slate-400 group-hover:text-zindo-blue-400"
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

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
          </div>
        </div>
      )}
    </div>
  );
}

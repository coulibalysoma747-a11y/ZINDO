"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ShoppingCart, MoreHorizontal, X, Boxes, DollarSign } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/nav";
import { NAV_ICONS, groupNavItems } from "./nav-icons";

/**
 * Barre du bas à 4 boutons (flag barre_bas_quatre), sur le modèle FasoStock
 * demandé par le propriétaire : Accueil, Produits, Vente (mise en avant),
 * Plus. « Plus » ouvre un panneau avec les actions rapides de l'ancien
 * bouton « + » et tous les autres modules, rangés par rubrique.
 */
export function MobileTabBarFour({
  navItems,
  menuItems,
  canSell,
  canManageProducts,
  canManageStock,
  canManagePurchases,
  salesHub = false,
}: {
  /** Droits d'accès complets (pour savoir quels onglets montrer). */
  navItems: NavItem[];
  /** Entrées du menu (celles du panneau « Plus »). */
  menuItems: NavItem[];
  canSell: boolean;
  canManageProducts: boolean;
  canManageStock: boolean;
  canManagePurchases: boolean;
  salesHub?: boolean;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const hrefs = new Set(navItems.map((i) => i.href));
  const isActive = (base: string) => pathname === base || pathname.startsWith(`${base}/`);

  const saleHref = salesHub ? "/ventes/accueil" : "/ventes";
  const quickActions = [
    { href: "/ventes", label: "Nouvelle vente", icon: ShoppingCart, show: canSell },
    { href: "/produits/nouveau", label: "Ajouter un produit", icon: Package, show: canManageProducts },
    { href: "/stock/entree", label: "Entrée de stock", icon: Boxes, show: canManageStock },
    { href: "/achats/nouveau", label: "Nouvel achat", icon: DollarSign, show: canManagePurchases },
  ].filter((a) => a.show);

  // Tout ce qui n'a pas son propre bouton en bas.
  const moreGroups = groupNavItems(
    menuItems.filter((i) => !["/dashboard", "/produits", "/ventes", "/ventes/accueil"].includes(i.href))
  );
  const moreActive = !isActive("/dashboard") && !isActive("/produits") && !isActive("/ventes") && !isActive("/factures");

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setMoreOpen(false)}
            className="animate-zindo-fade-in absolute inset-0 bg-zindo-ink-950/50 backdrop-blur-[2px]"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-zindo-float animate-zindo-fade-in-up dark:bg-slate-900">
            <div className="flex items-center justify-between px-4 pb-2 pt-3">
              <p className="text-base font-semibold text-zinc-900">Plus</p>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setMoreOpen(false)}
                className="rounded-full bg-zinc-100 p-1.5 text-zinc-500 hover:bg-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              {quickActions.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Actions rapides</p>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((a) => (
                      <Link
                        key={a.href}
                        href={a.href}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl border border-zinc-200 p-3 text-sm font-medium text-zinc-800 active:bg-zinc-50 dark:border-slate-800 dark:text-slate-200"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zindo-green-50 text-zindo-green-700">
                          <a.icon className="h-4.5 w-4.5" />
                        </span>
                        {a.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {moreGroups.map((group) => (
                <div key={group.title ?? "autres"} className="mb-4">
                  {group.title && (
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">{group.title}</p>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {group.items.map((item) => {
                      const Icon = NAV_ICONS[item.icon];
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-100 px-1 py-3 text-center text-xs font-medium text-zinc-700 active:bg-zinc-50 dark:border-slate-800 dark:text-slate-300"
                        >
                          <Icon className="h-5 w-5 text-zindo-green-700 dark:text-zindo-green-300" />
                          <span className="leading-tight">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden print:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <div className="grid grid-cols-4 items-center">
          <Tab href="/dashboard" label="Accueil" icon={Home} active={isActive("/dashboard")} />
          {hrefs.has("/produits") ? (
            <Tab href="/produits" label="Produits" icon={Package} active={isActive("/produits")} />
          ) : (
            <div />
          )}
          {hrefs.has("/ventes") ? (
            <Tab href={saleHref} label="Vente" icon={ShoppingCart} active={isActive("/ventes") || isActive("/factures")} strong />
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            className="flex flex-col items-center gap-1 py-2"
          >
            <TabIcon icon={MoreHorizontal} active={moreActive} />
            <span className={cn("text-[10.5px]", moreActive ? "font-semibold text-zindo-green-700" : "font-medium text-zinc-500")}>Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function TabIcon({ icon: Icon, active, strong = false }: { icon: typeof Home; active: boolean; strong?: boolean }) {
  return (
    <span
      className={cn(
        "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
        strong
          ? active
            ? "bg-zindo-green-600 text-white"
            : "bg-zindo-green-100 text-zindo-green-700 dark:bg-zindo-green-500/15 dark:text-zindo-green-300"
          : active
            ? "bg-zindo-green-100 text-zindo-green-700 dark:bg-zindo-green-500/15 dark:text-zindo-green-300"
            : "text-zinc-400"
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

function Tab({
  href,
  label,
  icon,
  active,
  strong = false,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
  strong?: boolean;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className="flex flex-col items-center gap-1 py-2">
      <TabIcon icon={icon} active={active} strong={strong} />
      <span
        className={cn(
          "text-[10.5px]",
          active || strong ? "font-semibold text-zindo-green-700 dark:text-zindo-green-300" : "font-medium text-zinc-500"
        )}
      >
        {label}
      </span>
    </Link>
  );
}

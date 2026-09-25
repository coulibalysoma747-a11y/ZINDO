"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingCart, Boxes, BarChart3, Plus, X, Package, DollarSign } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/nav";

/**
 * Barre de navigation basse — mobile uniquement, calquée sur la maquette
 * fournie par l'utilisateur. Complète le menu latéral (drawer via le bouton
 * hamburger du Topbar) avec les 4-5 destinations les plus fréquentes en
 * usage tactile, plus un bouton central pour les actions rapides.
 */
export function MobileTabBar({
  navItems,
  canSell,
  canManageProducts,
  canManageStock,
  canManagePurchases,
}: {
  navItems: NavItem[];
  canSell: boolean;
  canManageProducts: boolean;
  canManageStock: boolean;
  canManagePurchases: boolean;
}) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const hrefs = new Set(navItems.map((i) => i.href));

  const tabs = [
    { href: "/dashboard", label: "Accueil", icon: Home, show: true },
    { href: "/ventes", label: "Ventes", icon: ShoppingCart, show: hrefs.has("/ventes") },
    { href: "/stock", label: "Stock", icon: Boxes, show: hrefs.has("/stock") },
    { href: "/rapports", label: "Rapports", icon: BarChart3, show: hrefs.has("/rapports") },
  ].filter((t) => t.show);

  const quickActions = [
    { href: "/ventes", label: "Nouvelle vente", icon: ShoppingCart, show: canSell },
    { href: "/produits/nouveau", label: "Ajouter un produit", icon: Package, show: canManageProducts },
    { href: "/stock/entree", label: "Entrée de stock", icon: Boxes, show: canManageStock },
    { href: "/achats/nouveau", label: "Nouvel achat", icon: DollarSign, show: canManagePurchases },
  ].filter((a) => a.show);

  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2, 4);
  const fillerCount = Math.max(0, 4 - tabs.length);

  return (
    <>
      {sheetOpen && quickActions.length > 0 && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setSheetOpen(false)}
            className="animate-zindo-fade-in absolute inset-0 bg-zindo-ink-950/50 backdrop-blur-[2px]"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-zindo-float animate-zindo-fade-in-up dark:bg-slate-900">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-zinc-200" />
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="text-base font-bold text-zinc-900">Action rapide</p>
              <button type="button" aria-label="Fermer" onClick={() => setSheetOpen(false)} className="rounded-full bg-zinc-100 p-1.5 text-zinc-500 hover:bg-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                onClick={() => setSheetOpen(false)}
                className="flex flex-col items-start gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 text-sm font-semibold text-zinc-800 active:scale-[0.98] active:bg-zindo-green-50 dark:border-slate-800 dark:bg-slate-800/50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-zindo-green-400 to-zindo-green-600 text-white shadow-sm">
                  <a.icon className="h-5 w-5" />
                </span>
                {a.label}
              </Link>
            ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-8px_rgb(16_24_20/0.12)] backdrop-blur-md sm:hidden print:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <div className="grid grid-cols-5 items-center">
          {leftTabs.map((t) => (
            <TabLink key={t.href} {...t} active={pathname === t.href || pathname.startsWith(`${t.href}/`)} />
          ))}

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => (quickActions.length > 0 ? setSheetOpen(true) : undefined)}
              aria-label="Action rapide"
              className="flex h-14 w-14 -translate-y-4 items-center justify-center rounded-2xl bg-gradient-to-br from-zindo-green-400 to-zindo-green-600 text-white shadow-lg shadow-zindo-green-800/30 ring-4 ring-white transition-transform active:scale-95 dark:ring-slate-900"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>

          {rightTabs.map((t) => (
            <TabLink key={t.href} {...t} active={pathname === t.href || pathname.startsWith(`${t.href}/`)} />
          ))}
          {Array.from({ length: fillerCount }).map((_, i) => (
            <div key={i} />
          ))}
        </div>
      </nav>
    </>
  );
}

function TabLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className="flex flex-col items-center gap-1 py-2">
      <span
        className={cn(
          "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
          active ? "bg-zindo-green-100 text-zindo-green-700 dark:bg-zindo-green-500/15 dark:text-zindo-green-300" : "text-zinc-400"
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className={cn("text-[10.5px]", active ? "font-semibold text-zindo-green-700 dark:text-zindo-green-300" : "font-medium text-zinc-500")}>{label}</span>
    </Link>
  );
}

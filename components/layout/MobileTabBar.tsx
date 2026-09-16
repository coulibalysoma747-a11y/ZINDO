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
            className="absolute inset-0 bg-zindo-ink-900/40"
          />
          <div className="absolute inset-x-0 bottom-0 space-y-1 rounded-t-2xl bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl animate-zindo-fade-in-up">
            <div className="flex items-center justify-between px-2 py-1.5">
              <p className="text-sm font-semibold text-zinc-900">Action rapide</p>
              <button type="button" onClick={() => setSheetOpen(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            {quickActions.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                onClick={() => setSheetOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zindo-green-50 text-zindo-green-600">
                  <a.icon className="h-4.5 w-4.5" />
                </span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden print:hidden">
        <div className="zindo-flag-stripe h-[3px] w-full" />
        <div className="grid grid-cols-5 items-center">
          {leftTabs.map((t) => (
            <TabLink key={t.href} {...t} active={pathname === t.href || pathname.startsWith(`${t.href}/`)} />
          ))}

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => (quickActions.length > 0 ? setSheetOpen(true) : undefined)}
              aria-label="Action rapide"
              className="zindo-flag-stripe flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full text-white shadow-lg shadow-zindo-ink-900/30"
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
    <Link href={href} className="flex flex-col items-center gap-0.5 py-2.5">
      <Icon className={cn("h-5 w-5", active ? "text-zindo-green-600" : "text-zinc-400")} />
      <span className={cn("text-[10px] font-medium", active ? "text-zindo-green-600" : "text-zinc-400")}>{label}</span>
    </Link>
  );
}

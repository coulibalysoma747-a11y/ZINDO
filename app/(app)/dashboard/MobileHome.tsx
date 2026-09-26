import Link from "next/link";
import {
  Bell,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Truck,
  Receipt,
  BarChart3,
  UserCog,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { getDashboardData } from "@/lib/actions/dashboard";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

/**
 * Accueil — calqué sur la maquette fournie par l'utilisateur (hero de ventes
 * du jour + raccourcis en grille + alertes). Commun au téléphone et à
 * l'ordinateur (voir dashboard/page.tsx) : la grille de raccourcis et le hero
 * s'élargissent simplement à partir de sm/lg, les stats détaillées et
 * tableaux "bureau" restant en plus, en dessous, à partir de sm.
 */
export function MobileHome({
  firstName,
  locationName,
  currency,
  data,
  canSell,
  canViewProducts,
  canViewStock,
  canViewCustomers,
  canViewSuppliers,
  canManageExpenses,
  canViewReports,
}: {
  firstName: string;
  locationName: string;
  currency: string;
  data: DashboardData;
  canSell: boolean;
  canViewProducts: boolean;
  canViewStock: boolean;
  canViewCustomers: boolean;
  canViewSuppliers: boolean;
  canManageExpenses: boolean;
  canViewReports: boolean;
}) {
  const hasAlerts = data.outOfStockCount > 0 || data.lowStockCount > 0;

  const trendPct =
    data.salesYesterday > 0 ? Math.round(((data.salesToday - data.salesYesterday) / data.salesYesterday) * 100) : null;

  const maxDay = Math.max(1, ...data.salesLast7Days);

  type Tile = {
    key: string;
    label: string;
    href: string;
    icon: typeof ShoppingCart;
    show: boolean;
  };
  const allTiles: Tile[] = [
    { key: "vente", label: "Vente", href: "/ventes", icon: ShoppingCart, show: canSell },
    { key: "produits", label: "Produits", href: "/produits", icon: Package, show: canViewProducts },
    { key: "stock", label: "Stock", href: "/stock", icon: Boxes, show: canViewStock },
    { key: "clients", label: "Clients", href: "/clients", icon: Users, show: canViewCustomers },
    { key: "fournisseurs", label: "Fournisseurs", href: "/fournisseurs", icon: Truck, show: canViewSuppliers },
    { key: "depenses", label: "Dépenses", href: "/depenses", icon: Receipt, show: canManageExpenses },
    { key: "rapports", label: "Rapports", href: "/rapports", icon: BarChart3, show: canViewReports },
    { key: "profil", label: "Profil", href: "/profil", icon: UserCog, show: true },
  ];
  const tiles = allTiles.filter((t) => t.show);

  return (
    <div className="space-y-5 pb-2 lg:max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div>
            <p className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">Bonjour, {firstName}</p>
            <p className="mt-0.5 text-sm text-zinc-500">
              {locationName} · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>
        <Link
          href="#mobile-alertes"
          aria-label="Voir les alertes"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition-colors hover:text-zinc-900 dark:border-slate-800 dark:bg-slate-900"
        >
          <Bell className="h-4.5 w-4.5" />
          {hasAlerts && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />}
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium text-zinc-500">Ventes aujourd&apos;hui</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-semibold leading-tight tracking-tight text-zinc-900 tabular-nums sm:text-4xl">{formatMoney(data.salesToday, currency)}</p>
            {trendPct !== null && (
              <p className="mt-1.5 text-xs text-zinc-500">
                <span className={`font-semibold ${trendPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {trendPct >= 0 ? "+" : "−"}
                  {Math.abs(trendPct)} %
                </span>{" "}
                par rapport à hier
              </p>
            )}
          </div>
          <div className="flex h-14 items-end gap-1 sm:h-20 sm:gap-1.5" aria-label="Ventes des 7 derniers jours">
            {data.salesLast7Days.map((v, i) => (
              <div
                key={i}
                className={`w-2 rounded-sm sm:w-3 ${i === 6 ? "bg-zindo-green-600" : "bg-zinc-200 dark:bg-slate-700"}`}
                style={{ height: `${Math.max(12, (v / maxDay) * 100)}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {tiles.length > 0 && (
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3 md:grid-cols-8">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.key} href={t.href} className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white px-1 py-3 text-center transition-colors hover:border-zinc-300 hover:bg-zinc-50 active:bg-zinc-100 dark:border-slate-800 dark:bg-slate-900">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zindo-green-50 text-zindo-green-700 dark:bg-zindo-green-500/10 dark:text-zindo-green-400">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="w-full truncate text-xs font-medium text-zinc-700">{t.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div id="mobile-alertes">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Alertes</h2>
        {!hasAlerts ? (
          <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-500 dark:border-slate-800 dark:bg-slate-900">
            Aucun produit en rupture ni en stock faible.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:border-slate-800 dark:bg-slate-900">
            {data.lowStockCount > 0 && (
              <Link href="/produits?filtre=stock-faible" className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-900">Stock faible</span>
                  <span className="block text-xs text-zinc-500">{data.lowStockCount} produit(s)</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
              </Link>
            )}
            {data.outOfStockCount > 0 && (
              <Link href="/produits?filtre=rupture" className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-zinc-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-900">Rupture de stock</span>
                  <span className="block text-xs text-zinc-500">{data.outOfStockCount} produit(s)</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

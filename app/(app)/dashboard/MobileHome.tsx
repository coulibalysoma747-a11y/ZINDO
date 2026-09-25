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
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { formatMoney } from "@/lib/format";
import type { getDashboardData } from "@/lib/actions/dashboard";

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

const TILE_TONES = {
  emerald: "bg-zindo-green-50 text-zindo-green-600 dark:bg-zindo-green-500/10 dark:text-zindo-green-400",
  gold: "bg-zindo-gold-100 text-zindo-gold-700 dark:bg-zindo-gold-500/10 dark:text-zindo-gold-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  zinc: "bg-zinc-100 text-zinc-600",
} as const;

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
    tone: keyof typeof TILE_TONES;
    show: boolean;
  };
  const allTiles: Tile[] = [
    { key: "vente", label: "Vente", href: "/ventes", icon: ShoppingCart, tone: "emerald", show: canSell },
    { key: "produits", label: "Produits", href: "/produits", icon: Package, tone: "amber", show: canViewProducts },
    { key: "stock", label: "Stock", href: "/stock", icon: Boxes, tone: "blue", show: canViewStock },
    { key: "clients", label: "Clients", href: "/clients", icon: Users, tone: "gold", show: canViewCustomers },
    { key: "fournisseurs", label: "Fournisseurs", href: "/fournisseurs", icon: Truck, tone: "red", show: canViewSuppliers },
    { key: "depenses", label: "Dépenses", href: "/depenses", icon: Receipt, tone: "gold", show: canManageExpenses },
    { key: "rapports", label: "Rapports", href: "/rapports", icon: BarChart3, tone: "emerald", show: canViewReports },
    { key: "profil", label: "Profil", href: "/profil", icon: UserCog, tone: "zinc", show: true },
  ];
  const tiles = allTiles.filter((t) => t.show);

  return (
    <div className="space-y-5 pb-2 lg:max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div>
            <p className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">
              Bonjour {firstName} <span aria-hidden>👋</span>
            </p>
            <p className="mt-0.5 text-sm text-zinc-500">
              {locationName} · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>
        <Link
          href="#mobile-alertes"
          aria-label="Voir les alertes"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200/80 bg-white text-zinc-600 shadow-zindo-card transition-colors hover:text-zinc-900 dark:border-slate-800 dark:bg-slate-900"
        >
          <Bell className="h-4.5 w-4.5" />
          {hasAlerts && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />}
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zindo-green-500 via-zindo-green-600 to-zindo-green-800 p-5 text-white shadow-xl shadow-zindo-green-900/25 sm:p-7">
        {/* Halos décoratifs (or et blanc) pour donner de la profondeur à la carte. */}
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-zindo-gold-400/25 blur-3xl" />
        <div className="relative flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-white/85">Ventes aujourd&apos;hui</p>
          <ZindoLogo size={30} className="!rounded-lg !shadow-md ring-1 ring-white/30" />
        </div>
        <div className="relative mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-extrabold leading-tight tracking-tight tabular-nums sm:text-4xl">{formatMoney(data.salesToday, currency)}</p>
            {trendPct !== null && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/20 backdrop-blur-sm">
                {trendPct >= 0 ? "↗" : "↘"} {Math.abs(trendPct)}% par rapport à hier
              </p>
            )}
          </div>
          <div className="flex h-14 items-end gap-1 sm:h-20 sm:gap-1.5" aria-label="Ventes des 7 derniers jours">
            {data.salesLast7Days.map((v, i) => (
              <div
                key={i}
                className={`w-2 rounded-full sm:w-3 ${i === 6 ? "bg-zindo-gold-300" : "bg-white/35"}`}
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
              <Link key={t.key} href={t.href} className="group flex flex-col items-center gap-2 rounded-2xl border border-zinc-200/70 bg-white px-1 py-3 text-center shadow-zindo-card transition-all hover:-translate-y-0.5 hover:shadow-zindo-raised active:scale-[0.97] dark:border-slate-800 dark:bg-slate-900">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 ${TILE_TONES[t.tone]}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="w-full truncate text-[11.5px] font-semibold text-zinc-700">{t.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div id="mobile-alertes">
        <h2 className="mb-2.5 text-[15px] font-bold text-zinc-900">Alertes</h2>
        {!hasAlerts ? (
          <p className="flex items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white px-4 py-3.5 text-sm text-zinc-600 shadow-zindo-card dark:border-slate-800 dark:bg-slate-900">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zindo-green-50 text-zindo-green-600">✓</span>
            Tout va bien : aucun produit en rupture ni en stock faible.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-zindo-card sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:border-slate-800 dark:bg-slate-900">
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

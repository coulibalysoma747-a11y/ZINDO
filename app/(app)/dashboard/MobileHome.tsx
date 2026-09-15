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
  emerald: "bg-zindo-green-50 text-zindo-green-600",
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-blue-50 text-blue-600",
  red: "bg-red-50 text-red-600",
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
  const hasAlerts = data.outOfStockCount > 0 || data.lowStockProducts.length > 0;

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
    { key: "clients", label: "Clients", href: "/clients", icon: Users, tone: "emerald", show: canViewCustomers },
    { key: "fournisseurs", label: "Fournisseurs", href: "/fournisseurs", icon: Truck, tone: "red", show: canViewSuppliers },
    { key: "depenses", label: "Dépenses", href: "/depenses", icon: Receipt, tone: "emerald", show: canManageExpenses },
    { key: "rapports", label: "Rapports", href: "/rapports", icon: BarChart3, tone: "emerald", show: canViewReports },
    { key: "profil", label: "Profil", href: "/profil", icon: UserCog, tone: "zinc", show: true },
  ];
  const tiles = allTiles.filter((t) => t.show);

  return (
    <div className="space-y-5 pb-2 lg:max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ZindoLogo size={36} />
          <div>
            <p className="text-sm text-zinc-500">
              Bonjour, <span className="font-medium text-zinc-700">{firstName}</span>
            </p>
            <p className="text-xs text-zinc-400">{locationName} · aujourd&apos;hui</p>
          </div>
        </div>
        <Link
          href="#mobile-alertes"
          aria-label="Voir les alertes"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500"
        >
          <Bell className="h-4.5 w-4.5" />
          {hasAlerts && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />}
        </Link>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-zindo-green-500 to-zindo-green-600 p-5 text-white shadow-lg shadow-zindo-green-800/20 sm:p-6">
        <p className="text-sm text-white/80">Ventes aujourd&apos;hui</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-bold leading-tight sm:text-3xl">{formatMoney(data.salesToday, currency)}</p>
            {trendPct !== null && (
              <p className="mt-1 text-xs font-medium text-white/90 sm:text-sm">
                {trendPct >= 0 ? "↑" : "↓"} {Math.abs(trendPct)}% vs hier
              </p>
            )}
          </div>
          <div className="flex h-12 items-end gap-1 sm:h-16 sm:gap-1.5">
            {data.salesLast7Days.map((v, i) => (
              <div
                key={i}
                className={`w-2 rounded-full sm:w-2.5 ${i === 6 ? "bg-white" : "bg-white/40"}`}
                style={{ height: `${Math.max(12, (v / maxDay) * 100)}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {tiles.length > 0 && (
        <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link key={t.key} href={t.href} className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 text-center shadow-sm">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${TILE_TONES[t.tone]}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium text-zinc-700">{t.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div id="mobile-alertes">
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">Alertes</h2>
        {!hasAlerts ? (
          <p className="rounded-2xl bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm">Aucune alerte pour le moment.</p>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-2xl bg-white shadow-sm sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {data.lowStockProducts.length > 0 && (
              <Link href="/produits?filtre=stock-faible" className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-900">Stock faible</span>
                  <span className="block text-xs text-zinc-500">{data.lowStockProducts.length} produit(s)</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300" />
              </Link>
            )}
            {data.outOfStockCount > 0 && (
              <Link href="/produits?filtre=rupture" className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-zinc-900">Rupture de stock</span>
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

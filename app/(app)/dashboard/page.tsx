import Link from "next/link";
import { requireUser, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getDashboardData, getDashboardOverview, getLocationsStockOverview } from "@/lib/actions/dashboard";
import { getCurrentLocation } from "@/lib/location";
import { getBusinessSettings } from "@/lib/business-settings";
import { formatMoney } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { HistoryFilters } from "@/components/history/HistoryFilters";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { PaymentBreakdownDetail } from "@/components/dashboard/PaymentBreakdownDetail";
import { MobileHome } from "./MobileHome";
import {
  Wallet,
  Percent,
  Receipt,
  PiggyBank,
  ShoppingCart,
  Ticket,
  Truck,
  Boxes,
  AlertTriangle,
  Store,
  Warehouse,
  Plus,
} from "lucide-react";

// Palette catégorielle validée (accessibilité daltonisme + contraste) de la
// skill dataviz — ordre fixe, jamais recyclé arbitrairement. Voir
// components/dashboard/RevenueTrendChart.tsx pour la même provenance.
const CATEGORY_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

const DASHBOARD_PERIODS = [
  { value: "aujourdhui", label: "Aujourd'hui" },
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois" },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const user = await requireUser();
  const currency = user.business.currency;
  const { periode } = await searchParams;
  const period = periode === "semaine" || periode === "mois" ? periode : "aujourdhui";
  const currentLocation = await getCurrentLocation(user.businessId);

  if (!currentLocation) {
    return (
      <EmptyState
        title="Aucune boutique configurée"
        description="Créez votre première boutique pour commencer à utiliser ZINDO."
        action={<ButtonLink href="/boutiques">Configurer une boutique</ButtonLink>}
      />
    );
  }

  const [
    data,
    overview,
    locationsOverview,
    canSell,
    canViewStock,
    canManageProducts,
    canManagePurchases,
    canViewProducts,
    canViewCustomers,
    canViewSuppliers,
    canManageExpenses,
    canViewReports,
    businessSettings,
  ] = await Promise.all([
    getDashboardData(user.businessId, currentLocation.id),
    getDashboardOverview(user.businessId, currentLocation.id, period),
    getLocationsStockOverview(user.businessId),
    hasPermission(user.businessId, user.role, PERMISSIONS.SALES_CREATE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.STOCK_VIEW, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.PRODUCTS_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.PURCHASES_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.PRODUCTS_VIEW, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.CUSTOMERS_VIEW, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.SUPPLIERS_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.EXPENSES_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.REPORTS_VIEW, user.id),
    getBusinessSettings(user.businessId),
  ]);

  const totalStockValue = locationsOverview.reduce((s, l) => s + l.stockValue, 0);

  // "Montrer mes chiffres de vente à mes employés" (Paramètres) : un non-admin
  // ne voit le classement des vendeurs que si le réglage l'autorise, et
  // seulement sur la journée en cours — jamais sur la période choisie ni tout
  // l'historique — même si le classement reste ouvert à l'écran.
  const canSeeLeaderboard = user.role === "ADMIN" || businessSettings.showSalesLeaderboardToEmployees;
  const leaderboardOverview =
    canSeeLeaderboard && user.role !== "ADMIN" && period !== "aujourdhui"
      ? await getDashboardOverview(user.businessId, currentLocation.id, "aujourdhui")
      : overview;

  return (
    <div className="space-y-6">
      {/* Accueil (hero + raccourcis + alertes), calqué sur la maquette fournie
          par l'utilisateur — commun au téléphone et à l'ordinateur. Les stats
          détaillées et tableaux ci-dessous n'apparaissent qu'à partir de sm,
          là où il y a la place de les afficher confortablement. */}
      <MobileHome
        firstName={user.firstName}
        locationName={currentLocation.name}
        currency={currency}
        data={data}
        canSell={canSell}
        canViewProducts={canViewProducts}
        canViewStock={canViewStock}
        canViewCustomers={canViewCustomers}
        canViewSuppliers={canViewSuppliers}
        canManageExpenses={canManageExpenses}
        canViewReports={canViewReports}
      />

    <div className="hidden space-y-6 sm:block">
      {(canSell || canViewStock) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Vue d&apos;ensemble</h2>
            <p className="text-sm text-zinc-500">Chiffres de {currentLocation.name}</p>
          </div>
          <HistoryFilters paramName="periode" periods={DASHBOARD_PERIODS} defaultValue="aujourdhui" />
        </div>
      )}

      {canSell && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="CA encaissé"
            value={formatMoney(overview.current.cashedIn, currency)}
            icon={Wallet}
            hint={`${overview.current.salesCount} vente(s)${overview.current.creditRepayments > 0 ? ` · dont ${formatMoney(overview.current.creditRepayments, currency)} crédits` : ""}`}
            delta={overview.deltas.cashedIn}
          />
          <StatCard
            label="Marge"
            value={formatMoney(overview.current.margin, currency)}
            icon={Percent}
            tone="blue"
            hint={overview.current.cashedIn > 0 ? `${((overview.current.margin / overview.current.cashedIn) * 100).toFixed(1)}% du CA` : undefined}
            delta={overview.deltas.margin}
          />
          <StatCard
            label="Dépenses"
            value={formatMoney(overview.current.expenses, currency)}
            icon={Receipt}
            tone="amber"
            delta={overview.deltas.expenses}
          />
          <StatCard
            label="Bénéfice net"
            value={formatMoney(overview.current.netProfit, currency)}
            icon={PiggyBank}
            tone={overview.current.netProfit >= 0 ? "emerald" : "red"}
            hint={overview.current.cashedIn > 0 ? `${((overview.current.netProfit / overview.current.cashedIn) * 100).toFixed(1)}% du CA` : undefined}
            delta={overview.deltas.netProfit}
          />
          <StatCard
            label="Ventes"
            value={String(overview.current.salesCount)}
            icon={ShoppingCart}
            hint={`${overview.current.itemsSold} article(s) vendu(s)`}
            delta={overview.deltas.salesCount}
          />
          <StatCard
            label="Ticket moyen"
            value={formatMoney(overview.current.avgTicket, currency)}
            icon={Ticket}
            tone="blue"
            delta={overview.deltas.avgTicket}
          />
          <StatCard
            label="Achats"
            value={formatMoney(overview.current.purchases, currency)}
            icon={Truck}
            tone="amber"
            delta={overview.deltas.purchases}
          />
          {canViewStock && (
            <StatCard
              label="Valeur du stock"
              value={formatMoney(overview.stockValue, currency)}
              icon={Boxes}
              tone="blue"
              hint={`${data.productCount} produit(s) en stock`}
            />
          )}
        </div>
      )}
      {!canSell && canViewStock && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Valeur du stock (boutique)"
            value={formatMoney(data.stockValue, currency)}
            icon={Boxes}
            tone="blue"
            hint={`${data.productCount} produit(s) en stock`}
          />
        </div>
      )}

      {canSell && overview.current.cashedIn > 0 && (businessSettings.dashboardShowPaymentBreakdown || canSeeLeaderboard) && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Détail des encaissements</h2>
            <span className="text-sm font-medium text-zinc-500">{formatMoney(overview.current.cashedIn, currency)}</span>
          </CardHeader>
          <CardBody className="space-y-5">
            {businessSettings.dashboardShowPaymentBreakdown && (
              <PaymentBreakdownDetail cashedIn={overview.current.cashedIn} byMethod={overview.current.byMethod} currency={currency} />
            )}

            {canSeeLeaderboard && leaderboardOverview.vendorBreakdown.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-zinc-700">
                  Part de chaque vendeur
                  {user.role !== "ADMIN" && period !== "aujourdhui" && (
                    <span className="ml-1 font-normal text-zinc-400">(aujourd&apos;hui)</span>
                  )}
                </p>
                <ul className="space-y-2">
                  {leaderboardOverview.vendorBreakdown.map((v) => (
                    <li key={v.userId} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-700">
                          {v.name} <span className="text-zinc-400">· {v.count} règlement(s)</span>
                        </span>
                        <span className="font-medium text-zinc-900">{formatMoney(v.total, currency)}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full bg-zindo-green-500"
                          style={{ width: `${(v.total / leaderboardOverview.current.cashedIn) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {canSell && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <h2 className="font-semibold text-zinc-900">Évolution du chiffre d&apos;affaires</h2>
              <span className="text-xs text-zinc-400">7 derniers jours</span>
            </CardHeader>
            <CardBody>
              <RevenueTrendChart values={data.salesLast7Days} currency={currency} />
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <h2 className="font-semibold text-zinc-900">Ventes par catégorie</h2>
            </CardHeader>
            <CardBody>
              {overview.categoryBreakdown.length === 0 ? (
                <EmptyState title="Aucune vente sur la période" description="La répartition par catégorie apparaîtra ici dès votre première vente." />
              ) : (
                <ul className="space-y-2.5">
                  {(() => {
                    const max = Math.max(1, ...overview.categoryBreakdown.map((c) => c.total));
                    return overview.categoryBreakdown.map((c, i) => (
                      <li key={c.name}>
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-1.5 truncate text-zinc-700" title={c.name}>
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: c.name === "Autres" ? "#898781" : CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                            />
                            {c.name}
                          </span>
                          <span className="shrink-0 font-medium text-zinc-900">{formatMoney(c.total, currency)}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(c.total / max) * 100}%`,
                              backgroundColor: c.name === "Autres" ? "#898781" : CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                            }}
                          />
                        </div>
                      </li>
                    ));
                  })()}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {(canSell || canManageProducts || canManagePurchases || canManageExpenses) && (
        <div className="flex flex-wrap gap-3">
          {canSell && <ButtonLink href="/ventes">Nouvelle vente</ButtonLink>}
          {canManageProducts && (
            <ButtonLink href="/produits/nouveau" variant="outline">
              <Plus className="h-4 w-4" /> Nouveau produit
            </ButtonLink>
          )}
          {canManagePurchases && (
            <ButtonLink href="/achats/nouveau" variant="outline">
              Nouvel achat
            </ButtonLink>
          )}
          {canManageExpenses && (
            <ButtonLink href="/depenses" variant="outline">
              Nouvelle dépense
            </ButtonLink>
          )}
        </div>
      )}

      {canViewStock && locationsOverview.length > 1 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Stock par boutique</h2>
            <Link href="/boutiques" className="text-sm font-medium text-zindo-green-600 hover:text-zindo-green-700 hover:underline">
              Gérer les boutiques
            </Link>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {locationsOverview.map((l) => (
                <div
                  key={l.id}
                  className={`rounded-xl border px-4 py-3 ${
                    l.id === currentLocation.id
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-500/10"
                      : "border-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    {l.type === "DEPOT" ? <Warehouse className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                    {l.name}
                  </div>
                  <p className="mt-1 text-lg font-bold text-zinc-900">{formatMoney(l.stockValue, currency)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-zinc-100 pt-3 text-sm">
              <span className="font-medium text-zinc-600">Total (toutes boutiques)</span>
              <span className="font-bold text-zinc-900">{formatMoney(totalStockValue, currency)}</span>
            </div>
          </CardBody>
        </Card>
      )}

      {(canSell || canViewStock) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {canSell && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-zinc-900">Top produits</h2>
                <Link href="/rapports" className="text-sm font-medium text-zindo-green-600 hover:text-zindo-green-700 hover:underline">
                  Voir les rapports
                </Link>
              </CardHeader>
              <CardBody>
                {overview.topByRevenue.length === 0 ? (
                  <EmptyState
                    title="Aucune vente sur la période"
                    description="Les produits les plus vendus apparaîtront ici dès votre première vente."
                  />
                ) : (
                  <ol className="space-y-2.5">
                    {overview.topByRevenue.map((p, i) => (
                      <li key={p.productId} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2.5 text-zinc-700">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums ${
                              i === 0 ? "bg-zindo-green-50 text-zindo-green-700" : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </span>
                        <span className="shrink-0 font-medium text-zinc-900">{formatMoney(p.total, currency)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardBody>
            </Card>
          )}

          {canSell && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-zinc-900">Meilleure marge</h2>
              </CardHeader>
              <CardBody>
                {overview.topByMargin.length === 0 ? (
                  <EmptyState
                    title="Aucune vente sur la période"
                    description="Le classement par marge apparaîtra ici dès votre première vente."
                  />
                ) : (
                  <ol className="space-y-2.5">
                    {overview.topByMargin.map((p, i) => (
                      <li key={p.productId} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2.5 text-zinc-700">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums ${
                              i === 0 ? "bg-zindo-green-50 text-zindo-green-700" : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </span>
                        <span className="shrink-0 font-medium text-zindo-green-600">{formatMoney(p.margin, currency)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardBody>
            </Card>
          )}

          {canViewStock && (
            <Card className={canSell ? "" : "lg:col-span-3"}>
              <CardHeader>
                <h2 className="flex items-center gap-2 font-semibold text-zinc-900">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertes de stock
                </h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {data.outOfStockCount > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2.5 dark:bg-red-500/10">
                    <span className="text-sm text-red-700">Produits en rupture</span>
                    <Badge tone="red">{data.outOfStockCount}</Badge>
                  </div>
                )}
                {data.lowStockCount > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5 dark:bg-amber-500/10">
                    <span className="text-sm text-amber-700">Produits en stock faible</span>
                    <Badge tone="amber">{data.lowStockCount}</Badge>
                  </div>
                )}
                {data.lowStockCount === 0 && data.outOfStockCount === 0 ? (
                  <p className="text-sm text-zinc-500">Aucune alerte pour le moment.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.lowStockProducts.slice(0, 6).map((p) => (
                      <li key={p.id} className="flex items-center justify-between text-sm">
                        <span className="truncate text-zinc-700">{p.name}</span>
                        <Badge tone="amber">
                          {p.quantity} / {p.minStock}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/produits?filtre=stock-faible"
                  className="block text-center text-sm font-medium text-emerald-600 hover:underline"
                >
                  Voir tous les produits concernés
                </Link>
              </CardBody>
            </Card>
          )}
        </div>
      )}

    </div>
    </div>
  );
}

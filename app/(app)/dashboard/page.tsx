import Link from "next/link";
import { requireUser, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getDashboardData, getTopProducts, getLocationsStockOverview } from "@/lib/actions/dashboard";
import { getCurrentLocation } from "@/lib/location";
import { formatMoney } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import {
  DollarSign,
  TrendingUp,
  Package,
  Boxes,
  ShoppingCart,
  AlertTriangle,
  Store,
  Warehouse,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await requireUser();
  const currency = user.business.currency;
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

  const [data, topProducts, locationsOverview, canSell, canViewStock, canManageStock, canManageProducts, canManagePurchases] =
    await Promise.all([
      getDashboardData(user.businessId, currentLocation.id),
      getTopProducts(user.businessId, currentLocation.id),
      getLocationsStockOverview(user.businessId),
      hasPermission(user.businessId, user.role, PERMISSIONS.SALES_CREATE, user.id),
      hasPermission(user.businessId, user.role, PERMISSIONS.STOCK_VIEW, user.id),
      hasPermission(user.businessId, user.role, PERMISSIONS.STOCK_MANAGE, user.id),
      hasPermission(user.businessId, user.role, PERMISSIONS.PRODUCTS_MANAGE, user.id),
      hasPermission(user.businessId, user.role, PERMISSIONS.PURCHASES_MANAGE, user.id),
    ]);

  const totalStockValue = locationsOverview.reduce((s, l) => s + l.stockValue, 0);
  const hasQuickActions = canSell || canManageProducts || canManageStock || canManagePurchases;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Tableau de bord</h1>
        <p className="text-sm text-zinc-500">
          Bonjour {user.firstName}, voici la situation de {currentLocation.name} aujourd&apos;hui.
        </p>
      </div>

      {(canSell || canViewStock) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canSell && (
            <>
              <StatCard
                label="Ventes du jour"
                value={formatMoney(data.salesToday, currency)}
                icon={DollarSign}
                hint={`${data.salesCountToday} vente(s) · ${data.soldQtyToday} article(s)`}
              />
              <StatCard
                label="Bénéfice estimé (jour)"
                value={formatMoney(data.profitToday, currency)}
                icon={TrendingUp}
                tone="blue"
              />
              <StatCard
                label="Chiffre d'affaires du mois"
                value={formatMoney(data.salesMonth, currency)}
                icon={ShoppingCart}
                tone="amber"
              />
            </>
          )}
          {canViewStock && (
            <StatCard
              label="Valeur du stock (boutique)"
              value={formatMoney(data.stockValue, currency)}
              icon={Boxes}
              tone="blue"
              hint={`${data.productCount} produit(s) en stock`}
            />
          )}
        </div>
      )}

      {canViewStock && locationsOverview.length > 1 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Stock par boutique</h2>
            <Link href="/boutiques" className="text-sm text-emerald-600 hover:underline">
              Gérer les boutiques
            </Link>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {locationsOverview.map((l) => (
                <div
                  key={l.id}
                  className={`rounded-lg border px-4 py-3 ${
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
            <Card className={canViewStock ? "lg:col-span-2" : "lg:col-span-3"}>
              <CardHeader>
                <h2 className="font-semibold text-zinc-900">Produits les plus vendus (ce mois, {currentLocation.name})</h2>
                <Link href="/rapports" className="text-sm text-emerald-600 hover:underline">
                  Voir les rapports
                </Link>
              </CardHeader>
              <CardBody>
                {topProducts.length === 0 ? (
                  <EmptyState
                    title="Aucune vente ce mois-ci"
                    description="Les produits les plus vendus apparaîtront ici dès votre première vente."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[320px] text-sm">
                      <thead>
                        <tr className="text-left text-zinc-500">
                          <th className="pb-2 font-medium">Produit</th>
                          <th className="pb-2 font-medium">Qté vendue</th>
                          <th className="pb-2 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {topProducts.map((p) => (
                          <tr key={p.productId}>
                            <td className="py-2 text-zinc-900">{p.name}</td>
                            <td className="py-2 text-zinc-600">{p.quantity}</td>
                            <td className="py-2 text-right font-medium text-zinc-900">
                              {formatMoney(p.total, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                  <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                    <span className="text-sm text-red-700">Produits en rupture</span>
                    <Badge tone="red">{data.outOfStockCount}</Badge>
                  </div>
                )}
                {data.lowStockProducts.length === 0 && data.outOfStockCount === 0 ? (
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

      {hasQuickActions && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {canSell && (
            <Link
              href="/ventes"
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-center hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-emerald-500/10"
            >
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-zinc-700">Nouvelle vente</span>
            </Link>
          )}
          {canManageProducts && (
            <Link
              href="/produits/nouveau"
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-center hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-emerald-500/10"
            >
              <Package className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-zinc-700">Ajouter un produit</span>
            </Link>
          )}
          {canManageStock && (
            <Link
              href="/stock/entree"
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-center hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-emerald-500/10"
            >
              <Boxes className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-zinc-700">Entrée de stock</span>
            </Link>
          )}
          {canManagePurchases && (
            <Link
              href="/achats/nouveau"
              className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-white p-4 text-center hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-emerald-500/10"
            >
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-zinc-700">Nouvel achat</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

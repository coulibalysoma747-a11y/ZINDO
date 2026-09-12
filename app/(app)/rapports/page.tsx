import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getSalesReport, getStockReport, getPurchasesReport } from "@/lib/actions/reports";
import { getCurrentLocation } from "@/lib/location";
import { formatMoney, startOfToday, startOfWeek, startOfMonth } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { HistoryFilters } from "@/components/history/HistoryFilters";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.REPORTS_VIEW);
  const { periode } = await searchParams;
  const currency = user.business.currency;
  const currentLocation = await getCurrentLocation(user.businessId);

  if (!currentLocation) {
    return (
      <EmptyState
        title="Aucune boutique configurée"
        description="Créez une boutique pour consulter ses rapports."
        action={<ButtonLink href="/boutiques">Configurer une boutique</ButtonLink>}
      />
    );
  }

  let dateFrom: Date | undefined;
  if (periode === "aujourdhui") dateFrom = startOfToday();
  else if (periode === "semaine") dateFrom = startOfWeek();
  else if (periode === "mois") dateFrom = startOfMonth();

  const [salesReport, stockReport, purchasesReport] = await Promise.all([
    getSalesReport(user.businessId, currentLocation.id, dateFrom),
    getStockReport(user.businessId, currentLocation.id),
    getPurchasesReport(user.businessId, currentLocation.id, dateFrom),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Rapports</h1>
          <p className="text-sm text-zinc-500">Synthèse de l&apos;activité de {currentLocation.name}.</p>
        </div>
        <HistoryFilters paramName="periode" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Rapport des ventes</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Chiffre d'affaires" value={formatMoney(salesReport.revenue, currency)} />
              <Stat label="Bénéfice estimé" value={formatMoney(salesReport.profit, currency)} />
              <Stat label="Nombre de ventes" value={String(salesReport.salesCount)} />
              <Stat label="Articles vendus" value={String(salesReport.itemsSold)} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700">Top produits vendus</p>
              {salesReport.topProducts.length === 0 ? (
                <p className="text-sm text-zinc-400">Aucune vente sur la période</p>
              ) : (
                <ul className="space-y-1.5">
                  {salesReport.topProducts.map((p) => (
                    <li key={p.productId} className="flex justify-between text-sm">
                      <span className="text-zinc-700">{p.name}</span>
                      <span className="text-zinc-500">
                        {p.quantity} vendu(s) · {formatMoney(p.total, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Rapport des achats</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Montant des achats" value={formatMoney(purchasesReport.total, currency)} />
              <Stat label="Nombre d'achats" value={String(purchasesReport.purchaseCount)} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-700">Répartition par fournisseur</p>
              {purchasesReport.suppliers.length === 0 ? (
                <p className="text-sm text-zinc-400">Aucun achat sur la période</p>
              ) : (
                <ul className="space-y-1.5">
                  {purchasesReport.suppliers.map((s) => (
                    <li key={s.name} className="flex justify-between text-sm">
                      <span className="text-zinc-700">{s.name}</span>
                      <span className="text-zinc-500">{formatMoney(s.total, currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Rapport de stock</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Valeur du stock (achat)" value={formatMoney(stockReport.stockValue, currency)} />
              <Stat label="Valeur potentielle (vente)" value={formatMoney(stockReport.potentialValue, currency)} />
              <Stat label="Produits en rupture" value={String(stockReport.outOfStock.length)} />
              <Stat label="Produits à faible stock" value={String(stockReport.lowStock.length)} />
            </div>
            {(stockReport.outOfStock.length > 0 || stockReport.lowStock.length > 0) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {stockReport.outOfStock.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-zinc-700">En rupture</p>
                    <div className="flex flex-wrap gap-1.5">
                      {stockReport.outOfStock.slice(0, 15).map((p) => (
                        <Badge key={p.id} tone="red">
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {stockReport.lowStock.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-zinc-700">Stock faible</p>
                    <div className="flex flex-wrap gap-1.5">
                      {stockReport.lowStock.slice(0, 15).map((p) => (
                        <Badge key={p.id} tone="amber">
                          {p.name} ({p.quantity})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

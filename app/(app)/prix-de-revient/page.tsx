import { Calculator } from "lucide-react";
import { getCostPriceReportAction } from "@/lib/actions/cost-price";
import { formatMoney } from "@/lib/format";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

export default async function CostPricePage() {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const currency = user.business.currency;
  const rows = await getCostPriceReportAction();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Prix de revient</h1>
          <p className="text-sm text-zinc-500">
            Coût moyen réellement payé (historique des achats), à comparer au prix d&apos;achat renseigné sur chaque fiche produit.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucun produit" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table className="min-w-[640px]">
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>Produit</TableHeaderCell>
                <TableHeaderCell align="right">Prix d&apos;achat (fiche)</TableHeaderCell>
                <TableHeaderCell align="right">Coût de revient moyen</TableHeaderCell>
                <TableHeaderCell align="right">Prix de vente</TableHeaderCell>
                <TableHeaderCell align="right">Marge réelle</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const diverges =
                  r.averageCost !== null && Math.abs(r.averageCost - r.listedPurchasePrice) > r.listedPurchasePrice * 0.05;
                return (
                  <TableRow key={r.productId}>
                    <TableCell>
                      <p className="font-medium text-zinc-900 dark:text-slate-100">{r.name}</p>
                      <p className="text-xs text-zinc-400">Réf. {r.reference}</p>
                    </TableCell>
                    <TableCell align="right" className="tabular-nums text-zinc-600 dark:text-slate-400">
                      {formatMoney(r.listedPurchasePrice, currency)}
                    </TableCell>
                    <TableCell align="right">
                      {r.averageCost === null ? (
                        <span className="text-zinc-400">Pas d&apos;achat enregistré</span>
                      ) : (
                        <Badge tone={diverges ? "amber" : "zinc"}>{formatMoney(r.averageCost, currency)}</Badge>
                      )}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums text-zinc-600 dark:text-slate-400">
                      {formatMoney(r.salePrice, currency)}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {r.marginOnAverage === null ? (
                        "—"
                      ) : (
                        <span className={r.marginOnAverage >= 0 ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                          {formatMoney(r.marginOnAverage, currency)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

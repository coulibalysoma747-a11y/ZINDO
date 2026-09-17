import { Calculator } from "lucide-react";
import { getCostPriceReportAction } from "@/lib/actions/cost-price";
import { formatMoney } from "@/lib/format";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";

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
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Produit</th>
                <th className="px-4 py-3 text-right font-medium">Prix d&apos;achat (fiche)</th>
                <th className="px-4 py-3 text-right font-medium">Coût de revient moyen</th>
                <th className="px-4 py-3 text-right font-medium">Prix de vente</th>
                <th className="px-4 py-3 text-right font-medium">Marge réelle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => {
                const diverges =
                  r.averageCost !== null && Math.abs(r.averageCost - r.listedPurchasePrice) > r.listedPurchasePrice * 0.05;
                return (
                  <tr key={r.productId}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{r.name}</p>
                      <p className="text-xs text-zinc-400">Réf. {r.reference}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">{formatMoney(r.listedPurchasePrice, currency)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.averageCost === null ? (
                        <span className="text-zinc-400">Pas d&apos;achat enregistré</span>
                      ) : (
                        <Badge tone={diverges ? "amber" : "zinc"}>{formatMoney(r.averageCost, currency)}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">{formatMoney(r.salePrice, currency)}</td>
                    <td className="px-4 py-3 text-right">
                      {r.marginOnAverage === null ? (
                        "—"
                      ) : (
                        <span className={r.marginOnAverage >= 0 ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                          {formatMoney(r.marginOnAverage, currency)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

import { PackagePlus } from "lucide-react";
import { getRestockSuggestionsAction } from "@/lib/actions/restock";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";

export default async function RestockPage() {
  const rows = await getRestockSuggestionsAction();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PackagePlus className="h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Réassort</h1>
            <p className="text-sm text-zinc-500">Produits à recommander avant la rupture de stock.</p>
          </div>
        </div>
        <ButtonLink href="/achats/nouveau" variant="outline" size="sm">
          Créer un achat
        </ButtonLink>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Rien à recommander" description="Tous vos produits ont un stock suffisant." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {rows.map((r) => (
            <CardBody key={r.productId} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-zinc-900">{r.name}</p>
                <p className="text-xs text-zinc-500">
                  Réf. {r.reference}
                  {r.supplierName && ` — Fournisseur : ${r.supplierName}`}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <p className="text-xs text-zinc-400">Stock actuel</p>
                  <Badge tone={r.currentStock <= 0 ? "red" : "amber"}>
                    {r.currentStock} / min. {r.minStock}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-400">À commander</p>
                  <p className="font-bold text-zindo-green-600">{r.suggestedQty}</p>
                </div>
              </div>
            </CardBody>
          ))}
        </Card>
      )}
    </div>
  );
}

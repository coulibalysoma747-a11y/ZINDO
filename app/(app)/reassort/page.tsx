import { PackagePlus } from "lucide-react";
import { getRestockSuggestionsAction, getSmartRestockAction } from "@/lib/actions/restock";
import { isPurchaseOrdersModuleEnabled } from "@/lib/actions/purchase-orders";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { SmartRestockPlanner } from "./SmartRestockPlanner";

// Lecture de 90 jours de mouvements de stock, page par page.
export const maxDuration = 30;

const COVERAGE_CHOICES = [15, 30, 60];

export default async function RestockPage({
  searchParams,
}: {
  searchParams: Promise<{ couverture?: string; budget?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.STOCK_VIEW);

  if (await isPurchaseOrdersModuleEnabled(user.businessId)) {
    const params = await searchParams;
    const coverage = COVERAGE_CHOICES.includes(Number(params.couverture)) ? Number(params.couverture) : 30;
    const budgetValue = Number(params.budget);
    const budget = Number.isFinite(budgetValue) && budgetValue > 0 ? budgetValue : null;
    const [result, { data: suppliers }] = await Promise.all([
      getSmartRestockAction({ coverageDays: coverage, budget }),
      supabase.from("suppliers").select("id, name").eq("business_id", user.businessId).order("name"),
    ]);
    return (
      <SmartRestockPlanner
        result={result}
        suppliers={(suppliers ?? []) as { id: string; name: string }[]}
        coverageChoices={COVERAGE_CHOICES}
        currency={user.business.currency}
      />
    );
  }

  return <LegacyRestock />;
}

async function LegacyRestock() {
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

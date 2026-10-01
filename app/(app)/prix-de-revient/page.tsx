import Link from "next/link";
import { BookOpen, Calculator, Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { formatMoney } from "@/lib/format";
import { listArrivals, type ArrivalStatus } from "@/lib/cost-arrivals-data";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

const STATUS: Record<ArrivalStatus, { label: string; tone: "zinc" | "amber" | "emerald" }> = {
  BROUILLON: { label: "Brouillon", tone: "zinc" },
  EN_COURS: { label: "En cours", tone: "amber" },
  APPLIQUE: { label: "Appliqué", tone: "emerald" },
  RETABLI: { label: "Prix rétablis", tone: "zinc" },
};

export default async function CostPricePage() {
  const user = await requirePermission(PERMISSIONS.COST_PRICE_MANAGE);
  const currency = user.business.currency;
  const arrivals = await listArrivals(user.businessId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-slate-800">
            <Calculator className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Prix de revient</h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-500">
              Ce que la marchandise vous coûte vraiment, transport et douane compris, et le prix auquel vendre pour gagner ce que vous voulez.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/prix-de-revient/guide" variant="outline">
            <BookOpen className="h-4 w-4" /> Comment ça marche ?
          </ButtonLink>
          <ButtonLink href="/prix-de-revient/nouveau">
            <Plus className="h-4 w-4" /> Nouvel arrivage
          </ButtonLink>
        </div>
      </div>

      {arrivals.length === 0 ? (
        <EmptyState
          title="Aucun arrivage pour le moment"
          description="Un arrivage, c'est une commande reçue avec tous les frais payés pour qu'elle arrive chez vous. Créez-en un pour connaître le vrai prix de revient de vos articles."
          action={
            <ButtonLink href="/prix-de-revient/nouveau">
              <Plus className="h-4 w-4" /> Créer mon premier arrivage
            </ButtonLink>
          }
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <Table className="min-w-[760px]">
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>Arrivage</TableHeaderCell>
                <TableHeaderCell>Fournisseur</TableHeaderCell>
                <TableHeaderCell>Boutique</TableHeaderCell>
                <TableHeaderCell align="right">Marchandise</TableHeaderCell>
                <TableHeaderCell align="right">Frais</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {arrivals.map((a) => {
                const status = STATUS[a.status];
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link href={`/prix-de-revient/${a.id}`} className="font-medium text-zinc-900 hover:text-zindo-green-700 dark:text-slate-100">
                        {a.name}
                      </Link>
                      <p className="text-xs text-zinc-500">
                        {new Date(a.arrivalDate).toLocaleDateString("fr-FR")}
                        {a.reference ? ` · ${a.reference}` : ""} · {a.itemCount} article(s)
                      </p>
                    </TableCell>
                    <TableCell className="text-zinc-600">{a.supplierName ?? "—"}</TableCell>
                    <TableCell className="text-zinc-600">{a.locationName}</TableCell>
                    <TableCell align="right" className="tabular-nums">{formatMoney(a.goodsTotal, currency)}</TableCell>
                    <TableCell align="right" className="tabular-nums">{formatMoney(a.expensesTotal, currency)}</TableCell>
                    <TableCell>
                      <Badge tone={status.tone}>{status.label}</Badge>
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

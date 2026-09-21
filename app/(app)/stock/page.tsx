import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, CheckSquare } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getBusinessSettings } from "@/lib/business-settings";
import { formatDateTime, startOfToday, startOfYesterday, startOfWeek, startOfMonth } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { HistoryFilters } from "@/components/history/HistoryFilters";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

const REASON_LABELS: Record<string, string> = {
  ACHAT: "Achat",
  RETOUR_CLIENT: "Retour client",
  CORRECTION: "Correction",
  INVENTAIRE: "Inventaire",
  VENTE: "Vente",
  PRODUIT_ENDOMMAGE: "Produit endommagé",
  PERTE: "Perte",
  RETOUR_FOURNISSEUR: "Retour fournisseur",
  TRANSFERT: "Transfert",
  AUTRE: "Autre",
  ENLEVEMENT: "Enlèvement partenaire",
};

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.STOCK_VIEW);
  const { periode } = await searchParams;
  const businessSettings = await getBusinessSettings(user.businessId);

  let query = supabase
    .from("stock_movements")
    .select(
      "id, createdAt:created_at, direction, reason, quantity, oldStock:old_stock, newStock:new_stock, productId:product_id, product:products(name), location:locations(name), user:users(firstName:first_name, lastName:last_name)"
    )
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (periode === "aujourdhui") query = query.gte("created_at", startOfToday().toISOString());
  else if (periode === "hier")
    query = query.gte("created_at", startOfYesterday().toISOString()).lt("created_at", startOfToday().toISOString());
  else if (periode === "semaine") query = query.gte("created_at", startOfWeek().toISOString());
  else if (periode === "mois") query = query.gte("created_at", startOfMonth().toISOString());

  const { data } = await query;
  const movements = (data ?? []) as unknown as Array<{
    id: string;
    createdAt: string;
    direction: string;
    reason: string;
    quantity: number;
    oldStock: number;
    newStock: number;
    productId: string;
    product: { name: string };
    location: { name: string };
    user: { firstName: string; lastName: string };
  }>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Mouvements de stock</h1>
          <p className="text-sm text-zinc-500">{movements.length} mouvement(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {businessSettings.bulkStockFillEnabled && (
            <ButtonLink href="/stock/remplissage" variant="outline">
              <CheckSquare className="h-4 w-4" /> Remplir en un clic
            </ButtonLink>
          )}
          <ButtonLink href="/stock/entree" variant="secondary">
            <ArrowDownCircle className="h-4 w-4" /> Entrée
          </ButtonLink>
          <ButtonLink href="/stock/sortie" variant="secondary">
            <ArrowUpCircle className="h-4 w-4" /> Sortie
          </ButtonLink>
        </div>
      </div>

      <HistoryFilters paramName="periode" />

      {movements.length === 0 ? (
        <EmptyState title="Aucun mouvement sur cette période" />
      ) : (
        <>
          <Card className="hidden overflow-x-auto sm:block">
            <Table className="min-w-[700px]">
              <TableHead>
                <TableRow interactive={false}>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Boutique</TableHeaderCell>
                  <TableHeaderCell>Produit</TableHeaderCell>
                  <TableHeaderCell>Motif</TableHeaderCell>
                  <TableHeaderCell align="right">Quantité</TableHeaderCell>
                  <TableHeaderCell align="right">Stock avant → après</TableHeaderCell>
                  <TableHeaderCell>Utilisateur</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-zinc-600 dark:text-slate-400">{formatDateTime(new Date(m.createdAt))}</TableCell>
                    <TableCell className="text-zinc-600 dark:text-slate-400">{m.location.name}</TableCell>
                    <TableCell>
                      <Link href={`/produits/${m.productId}`} className="font-medium text-zinc-900 hover:text-emerald-600 dark:text-slate-100">
                        {m.product.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge tone={m.direction === "IN" ? "emerald" : "red"}>
                        {REASON_LABELS[m.reason] ?? m.reason}
                      </Badge>
                    </TableCell>
                    <TableCell align="right" className="tabular-nums text-zinc-700 dark:text-slate-300">
                      {m.direction === "IN" ? "+" : "-"}
                      {m.quantity}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums text-zinc-500 dark:text-slate-400">
                      {m.oldStock} → {m.newStock}
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-slate-400">
                      {m.user.firstName} {m.user.lastName}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-2 sm:hidden">
            {movements.map((m) => (
              <Card key={m.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/produits/${m.productId}`} className="font-medium text-zinc-900 hover:text-emerald-600">
                    {m.product.name}
                  </Link>
                  <Badge tone={m.direction === "IN" ? "emerald" : "red"}>{REASON_LABELS[m.reason] ?? m.reason}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {formatDateTime(new Date(m.createdAt))} · {m.location.name}
                </p>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-zinc-700">
                    {m.direction === "IN" ? "+" : "-"}
                    {m.quantity} ({m.oldStock} → {m.newStock})
                  </span>
                  <span className="text-xs text-zinc-500">
                    {m.user.firstName} {m.user.lastName}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

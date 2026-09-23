import Link from "next/link";
import { Printer } from "lucide-react";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDateTime, startOfToday, startOfYesterday, startOfWeek, startOfMonth } from "@/lib/format";
import { getBusinessSettings } from "@/lib/business-settings";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { HistoryFilters } from "@/components/history/HistoryFilters";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { UnclaimedToggle } from "./UnclaimedToggle";

const STATUS_TONE = {
  PAYEE: "emerald",
  PARTIELLE: "amber",
  CREDIT: "red",
  ANNULEE: "zinc",
} as const;

type SaleRow = {
  id: string;
  number: string;
  createdAt: string;
  status: keyof typeof STATUS_TONE;
  total: number;
  unclaimedAt: string | null;
  claimedAt: string | null;
  location: { name: string };
  customer: { name: string } | null;
  user: { firstName: string; lastName: string };
  items: Array<{ quantity: number; unitPrice: number; unitCost: number }>;
};

/** Marge réelle de la vente : prix d'achat figé au moment de la vente (sale_items.unit_cost). */
function saleMargin(sale: SaleRow) {
  return sale.items.reduce((s, i) => s + (i.unitPrice - i.unitCost) * i.quantity, 0);
}

export default async function SalesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);
  const { periode } = await searchParams;
  const businessSettings = await getBusinessSettings(user.businessId);
  // La marge révèle les prix d'achat : réservée à qui peut consulter les rapports (pas les vendeurs par défaut).
  const canSeeMargin = await hasPermission(user.businessId, user.role, PERMISSIONS.REPORTS_VIEW, user.id);

  let query = supabase
    .from("sales")
    .select(
      "id, number, createdAt:created_at, status, total, unclaimedAt:unclaimed_at, claimedAt:claimed_at, location:locations(name), customer:customers(name), user:users(firstName:first_name, lastName:last_name), items:sale_items(quantity, unitPrice:unit_price, unitCost:unit_cost)"
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
  const sales = (data ?? []) as unknown as SaleRow[];

  const currency = user.business.currency;
  const validSales = sales.filter((s) => s.status !== "ANNULEE");
  const total = validSales.reduce((s, sale) => s + sale.total, 0);
  const totalMargin = validSales.reduce((s, sale) => s + saleMargin(sale), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Historique des ventes</h1>
          <p className="text-sm text-zinc-500">
            {sales.length} vente(s) · {formatMoney(total, currency)}
            {canSeeMargin && (
              <>
                {" · "}
                <span className="font-medium text-emerald-700">Marge : {formatMoney(totalMargin, currency)}</span>
              </>
            )}
          </p>
        </div>
        <HistoryFilters paramName="periode" />
      </div>

      {sales.length === 0 ? (
        <EmptyState title="Aucune vente sur cette période" />
      ) : (
        <>
          <Card className="hidden overflow-x-auto sm:block">
            <Table className="min-w-[700px]">
              <TableHead>
                <TableRow interactive={false}>
                  <TableHeaderCell>N°</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Boutique</TableHeaderCell>
                  <TableHeaderCell>Client</TableHeaderCell>
                  <TableHeaderCell>Vendeur</TableHeaderCell>
                  <TableHeaderCell>Statut</TableHeaderCell>
                  <TableHeaderCell align="right">Total</TableHeaderCell>
                  {canSeeMargin && <TableHeaderCell align="right">Marge</TableHeaderCell>}
                  <TableHeaderCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((s) => {
                  const isUnclaimed = !!s.unclaimedAt && !s.claimedAt;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/ventes/${s.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                          {s.number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-slate-400">{formatDateTime(new Date(s.createdAt))}</TableCell>
                      <TableCell className="text-zinc-600 dark:text-slate-400">{s.location.name}</TableCell>
                      <TableCell className="text-zinc-600 dark:text-slate-400">{s.customer?.name ?? "Client de passage"}</TableCell>
                      <TableCell className="text-zinc-600 dark:text-slate-400">
                        {s.user.firstName} {s.user.lastName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
                          {isUnclaimed && <Badge tone="amber">À retirer</Badge>}
                        </div>
                      </TableCell>
                      <TableCell align="right" className="font-medium text-zinc-900 tabular-nums dark:text-slate-100">
                        {formatMoney(s.total, currency)}
                      </TableCell>
                      {canSeeMargin && (
                        <TableCell align="right" className="tabular-nums text-emerald-700">
                          {s.status === "ANNULEE" ? "—" : formatMoney(saleMargin(s), currency)}
                        </TableCell>
                      )}
                      <TableCell align="right">
                        <div className="flex items-center justify-end gap-1.5">
                          {businessSettings.trackUnclaimedGoods && s.status !== "ANNULEE" && (
                            <UnclaimedToggle saleId={s.id} unclaimed={isUnclaimed} />
                          )}
                          <Link
                            href={`/ventes/${s.id}?print=1`}
                            title="Réimprimer le ticket"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <Printer className="h-3.5 w-3.5" /> Réimprimer
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-2 sm:hidden">
            {sales.map((s) => {
              const isUnclaimed = !!s.unclaimedAt && !s.claimedAt;
              return (
                <Card key={s.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/ventes/${s.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                      {s.number}
                    </Link>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
                      {isUnclaimed && <Badge tone="amber">À retirer</Badge>}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-zinc-700">{s.customer?.name ?? "Client de passage"}</p>
                  <p className="text-xs text-zinc-500">
                    {formatDateTime(new Date(s.createdAt))} · {s.location.name} · {s.user.firstName} {s.user.lastName}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-zinc-900">
                      {formatMoney(s.total, currency)}
                      {canSeeMargin && s.status !== "ANNULEE" && (
                        <span className="ml-2 text-xs font-medium text-emerald-700">
                          Marge {formatMoney(saleMargin(s), currency)}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {businessSettings.trackUnclaimedGoods && s.status !== "ANNULEE" && (
                        <UnclaimedToggle saleId={s.id} unclaimed={isUnclaimed} />
                      )}
                      <Link
                        href={`/ventes/${s.id}?print=1`}
                        title="Réimprimer le ticket"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Printer className="h-3.5 w-3.5" /> Réimprimer
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import { Eye, Pencil, ShoppingCart, Wallet, Ticket, PiggyBank } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getBusinessSettings } from "@/lib/business-settings";
import { formatMoney, formatDateTime, startOfToday, startOfYesterday } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { HistoryFilters } from "@/components/history/HistoryFilters";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { CancelSaleButton } from "@/app/(app)/ventes/[id]/CancelSaleButton";
import { UnclaimedToggle } from "@/app/(app)/ventes/historique/UnclaimedToggle";
import { fetchAllPagesConcurrently } from "@/lib/supabase-paging";
import { isSalesSearchEnabled, saleMatchesQuery } from "@/lib/sales-search";
import { SalesSearchBox } from "@/components/sales/SalesSearchBox";

/** Au-delà, la liste n'affiche que les plus récentes (les totaux restent complets). */
const MAX_CARDS = 150;

/**
 * Historique des ventes affiché directement dans l'écran « Vente » (flag
 * accueil_vente), comme chez FasoStock : période, totaux, part de chaque
 * vendeur, puis chaque vente avec son bénéfice et ses boutons Voir /
 * Réimprimer, Modifier, Annuler.
 */

export const SALES_HISTORY_PERIODS = [
  { value: "aujourdhui", label: "Aujourd'hui" },
  { value: "hier", label: "Hier" },
  { value: "7j", label: "7 derniers jours" },
  { value: "30j", label: "30 derniers jours" },
];

const STATUS = {
  PAYEE: { label: "Payée", tone: "emerald" },
  PARTIELLE: { label: "Partielle", tone: "amber" },
  CREDIT: { label: "Crédit", tone: "red" },
  ANNULEE: { label: "Annulée", tone: "zinc" },
} as const;

const PAYMENT_LABELS: Record<string, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
  MIXTE: "Espèces + mobile money",
};

type SaleRow = {
  id: string;
  number: string;
  createdAt: string;
  status: keyof typeof STATUS;
  total: number;
  amountPaid: number | null;
  paymentMethod: string | null;
  unclaimedAt: string | null;
  claimedAt: string | null;
  location: { name: string };
  customer: { name: string } | null;
  user: { id: string; firstName: string; lastName: string };
  items: Array<{ quantity: number; unitPrice: number; unitCost: number }>;
};

/** Marge réelle : prix d'achat figé au moment de la vente (sale_items.unit_cost). */
function saleMargin(sale: SaleRow) {
  return sale.items.reduce((s, i) => s + (i.unitPrice - i.unitCost) * i.quantity, 0);
}

function periodStart(periode: string): { from: Date; to?: Date } {
  const today = startOfToday();
  if (periode === "hier") return { from: startOfYesterday(), to: today };
  if (periode === "7j") return { from: new Date(today.getTime() - 6 * 24 * 60 * 60_000) };
  if (periode === "30j") return { from: new Date(today.getTime() - 29 * 24 * 60 * 60_000) };
  return { from: today };
}

export async function SalesHistoryPanel({
  user,
  periode,
  query = "",
}: {
  user: { id: string; businessId: string; role: string; business: { currency: string } };
  periode: string;
  /** Recherche (flag recherche_ventes) : n° de ticket, vendeur, client, total ou payé exact. */
  query?: string;
}) {
  const role = user.role as Parameters<typeof hasPermission>[1];
  const [canSeeMargin, canEdit, canView, settings, searchEnabled, pro] = await Promise.all([
    // La marge révèle les prix d'achat : réservée à qui peut consulter les rapports.
    hasPermission(user.businessId, role, PERMISSIONS.REPORTS_VIEW, user.id),
    hasPermission(user.businessId, role, PERMISSIONS.SALES_CREATE, user.id),
    hasPermission(user.businessId, role, PERMISSIONS.SALES_VIEW, user.id),
    getBusinessSettings(user.businessId),
    isSalesSearchEnabled(user.businessId),
    isFeatureEnabled("interface_pro", user.businessId),
  ]);
  if (!canView) return null;

  const { from, to } = periodStart(periode);
  // Toute la période, page par page (autrefois 300 ventes au plus : totaux
  // faux sur 30 jours dans un commerce actif, anciennes ventes introuvables).
  const periodSales = await fetchAllPagesConcurrently<SaleRow>(
    (rangeFrom, rangeTo) => {
      let q = supabase
        .from("sales")
        .select(
          "id, number, createdAt:created_at, status, total, amountPaid:amount_paid, paymentMethod:payment_method, unclaimedAt:unclaimed_at, claimedAt:claimed_at, location:locations(name), customer:customers(name), user:users(id, firstName:first_name, lastName:last_name), items:sale_items(quantity, unitPrice:unit_price, unitCost:unit_cost)"
        )
        .eq("business_id", user.businessId)
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(rangeFrom, rangeTo);
      if (to) q = q.lt("created_at", to.toISOString());
      return q as unknown as PromiseLike<{ data: SaleRow[] | null; error: { message: string } | null }>;
    },
    { maxRows: 20000 }
  );

  const search = searchEnabled ? query.trim() : "";
  const sales = search
    ? periodSales.filter((s) =>
        saleMatchesQuery(
          {
            number: s.number,
            total: s.total,
            amountPaid: s.amountPaid,
            customerName: s.customer?.name ?? null,
            sellerName: `${s.user.firstName} ${s.user.lastName}`,
          },
          search
        )
      )
    : periodSales;

  const currency = user.business.currency;
  const valid = sales.filter((s) => s.status !== "ANNULEE");
  const cancelledCount = sales.length - valid.length;
  const total = valid.reduce((s, sale) => s + sale.total, 0);
  const margin = valid.reduce((s, sale) => s + saleMargin(sale), 0);
  const average = valid.length > 0 ? Math.round(total / valid.length) : 0;

  // Part de chaque vendeur : visible par l'administrateur, ou par tous si le
  // réglage « montrer les chiffres de vente aux employés » est actif.
  const showSellers = user.role === "ADMIN" || settings.showSalesLeaderboardToEmployees;
  const bySeller = new Map<string, { name: string; count: number; total: number }>();
  for (const s of valid) {
    const cur = bySeller.get(s.user.id) ?? { name: `${s.user.firstName} ${s.user.lastName}`, count: 0, total: 0 };
    cur.count += 1;
    cur.total += s.total;
    bySeller.set(s.user.id, cur);
  }
  const sellers = [...bySeller.values()].sort((a, b) => b.total - a.total);

  const stats = [
    { label: "Ventes", value: String(valid.length), hint: cancelledCount > 0 ? `${cancelledCount} annulée(s)` : undefined },
    { label: "Total encaissé", value: formatMoney(total, currency), hint: "hors ventes annulées" },
    { label: "Panier moyen", value: formatMoney(average, currency) },
    ...(canSeeMargin ? [{ label: "Bénéfice", value: formatMoney(margin, currency), hint: undefined, positive: true }] : []),
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-zinc-900">Historique des ventes</h2>
        <HistoryFilters paramName="periode" periods={SALES_HISTORY_PERIODS} defaultValue="aujourdhui" />
      </div>

      {searchEnabled && <SalesSearchBox initialQuery={search} />}
      {search && (
        <p className="text-sm text-zinc-600 dark:text-slate-400">
          {sales.length} vente{sales.length > 1 ? "s" : ""} trouvée{sales.length > 1 ? "s" : ""} pour « {search} » sur la période — les totaux
          ci-dessous portent sur ces ventes.
        </p>
      )}

      {pro ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((st, i) => (
            <StatCard key={st.label} label={st.label} value={st.value} icon={[ShoppingCart, Wallet, Ticket, PiggyBank][i] ?? Wallet} hint={st.hint} />
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${"positive" in s && s.positive ? "text-emerald-700" : "text-zinc-900"}`}>{s.value}</p>
            {s.hint && <p className="text-xs text-zinc-500">{s.hint}</p>}
          </Card>
        ))}
      </div>
      )}

      {showSellers && sellers.length > 0 && (
        <Card className="space-y-3 p-4">
          <p className="text-sm font-semibold text-zinc-900">Par vendeur</p>
          {sellers.map((v) => (
            <div key={v.name} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-zinc-800 dark:text-slate-200">{v.name}</span>
                <span className="shrink-0 font-semibold tabular-nums text-zinc-900 dark:text-slate-100">{formatMoney(v.total, currency)}</span>
              </div>
              <p className="text-xs text-zinc-500">
                {v.count} vente{v.count > 1 ? "s" : ""} · {total > 0 ? Math.round((v.total / total) * 100) : 0} % du total
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-zindo-green-500" style={{ width: `${total > 0 ? (v.total / total) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {sales.length === 0 ? (
        <EmptyState title={search ? "Aucune vente ne correspond à cette recherche" : "Aucune vente sur cette période"} />
      ) : (
        <>
        {sales.length > MAX_CARDS && (
          <p className="text-xs text-zinc-500">
            Affichage des {MAX_CARDS} ventes les plus récentes sur {sales.length} — utilisez la recherche ou une période plus courte pour
            retrouver les autres.
          </p>
        )}
        {pro && (
          <Card className="hidden overflow-x-auto lg:block">
            <Table className="min-w-[860px]">
              <TableHead>
                <TableRow interactive={false}>
                  <TableHeaderCell>N° de vente</TableHeaderCell>
                  <TableHeaderCell>Date et heure</TableHeaderCell>
                  <TableHeaderCell>Client</TableHeaderCell>
                  <TableHeaderCell>Paiement</TableHeaderCell>
                  <TableHeaderCell align="right">Total</TableHeaderCell>
                  <TableHeaderCell>Statut</TableHeaderCell>
                  <TableHeaderCell align="right">Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.slice(0, MAX_CARDS).map((s) => {
                  const cancelled = s.status === "ANNULEE";
                  const status = STATUS[s.status] ?? STATUS.PAYEE;
                  const unclaimed = !!s.unclaimedAt && !s.claimedAt;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold text-zinc-900">
                        <Link href={`/ventes/${s.id}`} className="hover:text-zindo-green-700">{s.number}</Link>
                      </TableCell>
                      <TableCell className="text-zinc-600">{formatDateTime(new Date(s.createdAt))}</TableCell>
                      <TableCell>{s.customer?.name ?? "Client de passage"}</TableCell>
                      <TableCell className="text-zinc-600">{s.paymentMethod ? PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod : "—"}</TableCell>
                      <TableCell align="right" className="font-semibold tabular-nums">{formatMoney(s.total, currency)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={status.tone}>{status.label}</Badge>
                          {unclaimed && <Badge tone="amber">À retirer</Badge>}
                        </div>
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link href={`/ventes/${s.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-[12.5px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-slate-700 dark:text-slate-200">
                            <Eye className="h-3.5 w-3.5" /> Ticket
                          </Link>
                          {canEdit && !cancelled && (
                            <Link href={`/ventes/${s.id}/modifier`} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-[12.5px] font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-slate-700 dark:text-slate-200">
                              <Pencil className="h-3.5 w-3.5" /> Modifier
                            </Link>
                          )}
                          {!cancelled && <CancelSaleButton saleId={s.id} />}
                          {settings.trackUnclaimedGoods && !cancelled && <UnclaimedToggle saleId={s.id} unclaimed={unclaimed} />}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 ${pro ? "lg:hidden" : ""}`}>
          {sales.slice(0, MAX_CARDS).map((s) => {
            const cancelled = s.status === "ANNULEE";
            const status = STATUS[s.status] ?? STATUS.PAYEE;
            const m = saleMargin(s);
            const pct = s.total > 0 ? Math.round((m / s.total) * 100) : 0;
            const unclaimed = !!s.unclaimedAt && !s.claimedAt;
            return (
              <Card key={s.id} className={`flex flex-col gap-2 p-4 ${cancelled ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/ventes/${s.id}`} className="font-bold text-zinc-900 hover:text-zindo-green-700 dark:text-slate-100">
                    {s.number}
                  </Link>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {unclaimed && <Badge tone="amber">À retirer</Badge>}
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  {formatDateTime(new Date(s.createdAt))} · {s.location.name} · par {s.user.firstName} {s.user.lastName}
                </p>
                <p className="text-sm text-zinc-700 dark:text-slate-300">
                  {s.customer?.name ?? "Client de passage"}
                  {s.paymentMethod && <span className="text-zinc-500"> · {PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod}</span>}
                </p>
                <div className="flex items-end justify-between gap-2">
                  <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-slate-100">{formatMoney(s.total, currency)}</p>
                  {canSeeMargin && !cancelled && (
                    <p className="text-sm font-semibold tabular-nums text-emerald-700">
                      Bénéfice +{formatMoney(m, currency)} <span className="font-normal text-zinc-500">{pct} %</span>
                    </p>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 dark:border-slate-800">
                  <Link
                    href={`/ventes/${s.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-slate-700 dark:text-slate-200"
                  >
                    <Eye className="h-4 w-4" /> Voir / Réimprimer
                  </Link>
                  {canEdit && !cancelled && (
                    <Link
                      href={`/ventes/${s.id}/modifier`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-slate-700 dark:text-slate-200"
                    >
                      <Pencil className="h-4 w-4" /> Modifier
                    </Link>
                  )}
                  {!cancelled && <CancelSaleButton saleId={s.id} />}
                  {settings.trackUnclaimedGoods && !cancelled && <UnclaimedToggle saleId={s.id} unclaimed={unclaimed} />}
                </div>
              </Card>
            );
          })}
        </div>
        </>
      )}
    </section>
  );
}

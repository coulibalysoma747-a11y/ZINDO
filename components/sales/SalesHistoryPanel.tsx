import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getBusinessSettings } from "@/lib/business-settings";
import { formatMoney, formatDateTime, startOfToday, startOfYesterday } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { HistoryFilters } from "@/components/history/HistoryFilters";
import { CancelSaleButton } from "@/app/(app)/ventes/[id]/CancelSaleButton";
import { UnclaimedToggle } from "@/app/(app)/ventes/historique/UnclaimedToggle";

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
}: {
  user: { id: string; businessId: string; role: string; business: { currency: string } };
  periode: string;
}) {
  const role = user.role as Parameters<typeof hasPermission>[1];
  const [canSeeMargin, canEdit, canView, settings] = await Promise.all([
    // La marge révèle les prix d'achat : réservée à qui peut consulter les rapports.
    hasPermission(user.businessId, role, PERMISSIONS.REPORTS_VIEW, user.id),
    hasPermission(user.businessId, role, PERMISSIONS.SALES_CREATE, user.id),
    hasPermission(user.businessId, role, PERMISSIONS.SALES_VIEW, user.id),
    getBusinessSettings(user.businessId),
  ]);
  if (!canView) return null;

  const { from, to } = periodStart(periode);
  let query = supabase
    .from("sales")
    .select(
      "id, number, createdAt:created_at, status, total, paymentMethod:payment_method, unclaimedAt:unclaimed_at, claimedAt:claimed_at, location:locations(name), customer:customers(name), user:users(id, firstName:first_name, lastName:last_name), items:sale_items(quantity, unitPrice:unit_price, unitCost:unit_cost)"
    )
    .eq("business_id", user.businessId)
    .gte("created_at", from.toISOString())
    .order("created_at", { ascending: false })
    .limit(300);
  if (to) query = query.lt("created_at", to.toISOString());
  const { data } = await query;
  const sales = (data ?? []) as unknown as SaleRow[];

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{s.label}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${"positive" in s && s.positive ? "text-emerald-700" : "text-zinc-900"}`}>{s.value}</p>
            {s.hint && <p className="text-xs text-zinc-500">{s.hint}</p>}
          </Card>
        ))}
      </div>

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
        <EmptyState title="Aucune vente sur cette période" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sales.map((s) => {
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
      )}
    </section>
  );
}

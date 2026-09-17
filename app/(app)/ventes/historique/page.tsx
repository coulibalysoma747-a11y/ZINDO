import Link from "next/link";
import { Printer } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDateTime, startOfToday, startOfYesterday, startOfWeek, startOfMonth } from "@/lib/format";
import { getBusinessSettings } from "@/lib/business-settings";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { HistoryFilters } from "@/components/history/HistoryFilters";
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
};

export default async function SalesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);
  const { periode } = await searchParams;
  const businessSettings = await getBusinessSettings(user.businessId);

  let query = supabase
    .from("sales")
    .select(
      "id, number, createdAt:created_at, status, total, unclaimedAt:unclaimed_at, claimedAt:claimed_at, location:locations(name), customer:customers(name), user:users(firstName:first_name, lastName:last_name)"
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
  const total = sales.filter((s) => s.status !== "ANNULEE").reduce((s, sale) => s + sale.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Historique des ventes</h1>
          <p className="text-sm text-zinc-500">
            {sales.length} vente(s) · {formatMoney(total, currency)}
          </p>
        </div>
        <HistoryFilters paramName="periode" />
      </div>

      {sales.length === 0 ? (
        <EmptyState title="Aucune vente sur cette période" />
      ) : (
        <>
          <Card className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">N°</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Boutique</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Vendeur</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sales.map((s) => {
                  const isUnclaimed = !!s.unclaimedAt && !s.claimedAt;
                  return (
                    <tr key={s.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3">
                        <Link href={`/ventes/${s.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                          {s.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{formatDateTime(new Date(s.createdAt))}</td>
                      <td className="px-4 py-3 text-zinc-600">{s.location.name}</td>
                      <td className="px-4 py-3 text-zinc-600">{s.customer?.name ?? "Client de passage"}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {s.user.firstName} {s.user.lastName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
                          {isUnclaimed && <Badge tone="amber">À retirer</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatMoney(s.total, currency)}</td>
                      <td className="px-4 py-3 text-right">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                    <span className="font-semibold text-zinc-900">{formatMoney(s.total, currency)}</span>
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

import Link from "next/link";
import { Printer } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDateTime, startOfToday, startOfYesterday, startOfWeek, startOfMonth } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { HistoryFilters } from "@/components/history/HistoryFilters";
import type { Prisma } from "@prisma/client";

const STATUS_TONE = {
  PAYEE: "emerald",
  PARTIELLE: "amber",
  CREDIT: "red",
  ANNULEE: "zinc",
} as const;

export default async function SalesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);
  const { periode } = await searchParams;

  const where: Prisma.SaleWhereInput = { businessId: user.businessId };
  if (periode === "aujourdhui") where.createdAt = { gte: startOfToday() };
  else if (periode === "hier") where.createdAt = { gte: startOfYesterday(), lt: startOfToday() };
  else if (periode === "semaine") where.createdAt = { gte: startOfWeek() };
  else if (periode === "mois") where.createdAt = { gte: startOfMonth() };

  const sales = await prisma.sale.findMany({
    where,
    include: { customer: true, user: true, location: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

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
        <Card className="overflow-x-auto">
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
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/ventes/${s.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                      {s.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{formatDateTime(s.createdAt)}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.location.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.customer?.name ?? "Client de passage"}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.user.firstName} {s.user.lastName}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">
                    {formatMoney(s.total, currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/ventes/${s.id}?print=1`}
                      title="Réimprimer le ticket"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <Printer className="h-3.5 w-3.5" /> Réimprimer
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

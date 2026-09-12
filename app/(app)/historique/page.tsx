import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDateTime, startOfToday, startOfYesterday, startOfWeek, startOfMonth } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { HistoryFilters } from "@/components/history/HistoryFilters";
import { TypeFilter } from "@/components/history/TypeFilter";

type Row = {
  date: Date;
  type: "Vente" | "Achat" | "Entrée" | "Sortie" | "Crédit remboursé" | "Paiement fournisseur";
  description: string;
  location: string;
  amount: number;
  user: string;
  tone: "emerald" | "red" | "amber" | "blue" | "zinc";
};

const TYPE_TO_FILTER: Record<string, Row["type"][]> = {
  ventes: ["Vente"],
  achats: ["Achat"],
  entrees: ["Entrée"],
  sorties: ["Sortie"],
  credits: ["Crédit remboursé"],
  paiements: ["Crédit remboursé", "Paiement fournisseur"],
};

export default async function GlobalHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; type?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.REPORTS_VIEW);
  const { periode, type } = await searchParams;
  const currency = user.business.currency;

  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;
  if (periode === "aujourdhui") dateFrom = startOfToday();
  else if (periode === "hier") {
    dateFrom = startOfYesterday();
    dateTo = startOfToday();
  } else if (periode === "semaine") dateFrom = startOfWeek();
  else if (periode === "mois") dateFrom = startOfMonth();

  const dateFilter = dateFrom ? { gte: dateFrom, ...(dateTo ? { lt: dateTo } : {}) } : undefined;

  const [sales, purchases, movements, customerPayments, supplierPayments] = await Promise.all([
    prisma.sale.findMany({
      where: { businessId: user.businessId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      include: { user: true, customer: true, location: true },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.purchase.findMany({
      where: { businessId: user.businessId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      include: { user: true, supplier: true, location: true },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.stockMovement.findMany({
      where: {
        businessId: user.businessId,
        reason: { notIn: ["VENTE", "ACHAT"] },
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      include: { user: true, product: true, location: true },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.customerPayment.findMany({
      where: { customer: { businessId: user.businessId }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      include: { user: true, customer: true },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
    prisma.supplierPayment.findMany({
      where: { supplier: { businessId: user.businessId }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      include: { user: true, supplier: true },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
  ]);

  const rows: Row[] = [
    ...sales.map((s): Row => ({
      date: s.createdAt,
      type: "Vente",
      description: `${s.number} — ${s.customer?.name ?? "Client de passage"}`,
      location: s.location.name,
      amount: s.total,
      user: `${s.user.firstName} ${s.user.lastName}`,
      tone: "emerald",
    })),
    ...purchases.map((p): Row => ({
      date: p.createdAt,
      type: "Achat",
      description: `${p.number} — ${p.supplier.name}`,
      location: p.location.name,
      amount: p.total,
      user: `${p.user.firstName} ${p.user.lastName}`,
      tone: "blue",
    })),
    ...movements.map((m): Row => ({
      date: m.createdAt,
      type: m.direction === "IN" ? "Entrée" : "Sortie",
      description: `${m.product.name} (${m.reason})`,
      location: m.location.name,
      amount: m.quantity,
      user: `${m.user.firstName} ${m.user.lastName}`,
      tone: m.direction === "IN" ? "emerald" : "red",
    })),
    ...customerPayments.map((p): Row => ({
      date: p.createdAt,
      type: "Crédit remboursé",
      description: p.customer.name,
      location: "—",
      amount: p.amount,
      user: `${p.user.firstName} ${p.user.lastName}`,
      tone: "amber",
    })),
    ...supplierPayments.map((p): Row => ({
      date: p.createdAt,
      type: "Paiement fournisseur",
      description: p.supplier.name,
      location: "—",
      amount: p.amount,
      user: `${p.user.firstName} ${p.user.lastName}`,
      tone: "zinc",
    })),
  ]
    .filter((r) => !type || TYPE_TO_FILTER[type]?.includes(r.type))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Historique global</h1>
        <p className="text-sm text-zinc-500">Toutes les opérations enregistrées dans ZINDO.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <HistoryFilters paramName="periode" />
        <TypeFilter />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucune opération sur cette période" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Boutique</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Détail</th>
                <th className="px-4 py-3 text-right font-medium">Montant / Qté</th>
                <th className="px-4 py-3 font-medium">Utilisateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-600">{formatDateTime(r.date)}</td>
                  <td className="px-4 py-3 text-zinc-600">{r.location}</td>
                  <td className="px-4 py-3">
                    <Badge tone={r.tone}>{r.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-900">{r.description}</td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">
                    {r.type === "Entrée" || r.type === "Sortie" ? r.amount : formatMoney(r.amount, currency)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{r.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}


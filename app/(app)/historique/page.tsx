import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
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

function applyDateFilter<T>(query: T, dateFrom: Date | undefined, dateTo: Date | undefined, column = "created_at") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any;
  if (dateFrom) q = q.gte(column, dateFrom.toISOString());
  if (dateTo) q = q.lt(column, dateTo.toISOString());
  return q;
}

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

  const [salesRes, purchasesRes, movementsRes, customerPaymentsRes, supplierPaymentsRes] = await Promise.all([
    applyDateFilter(
      supabase
        .from("sales")
        .select("createdAt:created_at, number, total, location:locations(name), customer:customers(name), user:users(firstName:first_name, lastName:last_name)")
        .eq("business_id", user.businessId)
        .order("created_at", { ascending: false })
        .limit(150),
      dateFrom,
      dateTo
    ),
    applyDateFilter(
      supabase
        .from("purchases")
        .select("createdAt:created_at, number, total, location:locations(name), supplier:suppliers(name), user:users(firstName:first_name, lastName:last_name)")
        .eq("business_id", user.businessId)
        .order("created_at", { ascending: false })
        .limit(150),
      dateFrom,
      dateTo
    ),
    applyDateFilter(
      supabase
        .from("stock_movements")
        .select("createdAt:created_at, direction, reason, quantity, product:products(name), location:locations(name), user:users(firstName:first_name, lastName:last_name)")
        .eq("business_id", user.businessId)
        .not("reason", "in", "(VENTE,ACHAT)")
        .order("created_at", { ascending: false })
        .limit(150),
      dateFrom,
      dateTo
    ),
    applyDateFilter(
      supabase
        .from("customer_payments")
        .select("createdAt:created_at, amount, customer:customers!inner(name, businessId:business_id), user:users(firstName:first_name, lastName:last_name)")
        .eq("customers.business_id", user.businessId)
        .order("created_at", { ascending: false })
        .limit(150),
      dateFrom,
      dateTo
    ),
    applyDateFilter(
      supabase
        .from("supplier_payments")
        .select("createdAt:created_at, amount, supplier:suppliers!inner(name, businessId:business_id), user:users(firstName:first_name, lastName:last_name)")
        .eq("suppliers.business_id", user.businessId)
        .order("created_at", { ascending: false })
        .limit(150),
      dateFrom,
      dateTo
    ),
  ]);

  const sales = (salesRes.data ?? []) as unknown as Array<{
    createdAt: string;
    number: string;
    total: number;
    location: { name: string };
    customer: { name: string } | null;
    user: { firstName: string; lastName: string };
  }>;
  const purchases = (purchasesRes.data ?? []) as unknown as Array<{
    createdAt: string;
    number: string;
    total: number;
    location: { name: string };
    supplier: { name: string };
    user: { firstName: string; lastName: string };
  }>;
  const movements = (movementsRes.data ?? []) as unknown as Array<{
    createdAt: string;
    direction: string;
    reason: string;
    quantity: number;
    product: { name: string };
    location: { name: string };
    user: { firstName: string; lastName: string };
  }>;
  const customerPayments = (customerPaymentsRes.data ?? []) as unknown as Array<{
    createdAt: string;
    amount: number;
    customer: { name: string };
    user: { firstName: string; lastName: string };
  }>;
  const supplierPayments = (supplierPaymentsRes.data ?? []) as unknown as Array<{
    createdAt: string;
    amount: number;
    supplier: { name: string };
    user: { firstName: string; lastName: string };
  }>;

  const rows: Row[] = [
    ...sales.map(
      (s): Row => ({
        date: new Date(s.createdAt),
        type: "Vente",
        description: `${s.number} — ${s.customer?.name ?? "Client de passage"}`,
        location: s.location.name,
        amount: s.total,
        user: `${s.user.firstName} ${s.user.lastName}`,
        tone: "emerald",
      })
    ),
    ...purchases.map(
      (p): Row => ({
        date: new Date(p.createdAt),
        type: "Achat",
        description: `${p.number} — ${p.supplier.name}`,
        location: p.location.name,
        amount: p.total,
        user: `${p.user.firstName} ${p.user.lastName}`,
        tone: "blue",
      })
    ),
    ...movements.map(
      (m): Row => ({
        date: new Date(m.createdAt),
        type: m.direction === "IN" ? "Entrée" : "Sortie",
        description: `${m.product.name} (${m.reason})`,
        location: m.location.name,
        amount: m.quantity,
        user: `${m.user.firstName} ${m.user.lastName}`,
        tone: m.direction === "IN" ? "emerald" : "red",
      })
    ),
    ...customerPayments.map(
      (p): Row => ({
        date: new Date(p.createdAt),
        type: "Crédit remboursé",
        description: p.customer.name,
        location: "—",
        amount: p.amount,
        user: `${p.user.firstName} ${p.user.lastName}`,
        tone: "amber",
      })
    ),
    ...supplierPayments.map(
      (p): Row => ({
        date: new Date(p.createdAt),
        type: "Paiement fournisseur",
        description: p.supplier.name,
        location: "—",
        amount: p.amount,
        user: `${p.user.firstName} ${p.user.lastName}`,
        tone: "zinc",
      })
    ),
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

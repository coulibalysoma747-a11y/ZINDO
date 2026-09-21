import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDate } from "@/lib/format";
import { getUpcomingInstallmentsAction } from "@/lib/actions/installments";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

type SaleRow = {
  createdAt: string;
  total: number;
  amountPaid: number;
  customer: { id: string; name: string; phone: string | null } | null;
};

export default async function CreditsPage() {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const currency = user.business.currency;

  const upcomingInstallments = await getUpcomingInstallmentsAction();

  const { data } = await supabase
    .from("sales")
    .select("createdAt:created_at, total, amountPaid:amount_paid, customer:customers(id, name, phone)")
    .eq("business_id", user.businessId)
    .in("status", ["CREDIT", "PARTIELLE"])
    .order("created_at", { ascending: true });
  const sales = (data ?? []) as unknown as SaleRow[];

  const byCustomer = new Map<
    string,
    { name: string; phone: string | null; total: number; oldest: Date; customerId: string }
  >();

  for (const sale of sales) {
    if (!sale.customer) continue;
    const remaining = sale.total - sale.amountPaid;
    if (remaining <= 0) continue;
    const createdAt = new Date(sale.createdAt);
    const existing = byCustomer.get(sale.customer.id);
    if (existing) {
      existing.total += remaining;
      if (createdAt < existing.oldest) existing.oldest = createdAt;
    } else {
      byCustomer.set(sale.customer.id, {
        name: sale.customer.name,
        phone: sale.customer.phone,
        total: remaining,
        oldest: createdAt,
        customerId: sale.customer.id,
      });
    }
  }

  const rows = Array.from(byCustomer.values()).sort((a, b) => b.total - a.total);
  const totalCredits = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Crédits clients</h1>
        <p className="text-sm text-zinc-500">Suivi des ventes à crédit et paiements partiels.</p>
      </div>

      <Card>
        <CardBody>
          <p className="text-sm text-zinc-500">Total des crédits en cours</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{formatMoney(totalCredits, currency)}</p>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="Aucun crédit en cours" description="Tous les clients sont à jour." />
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>Client</TableHeaderCell>
                <TableHeaderCell>Téléphone</TableHeaderCell>
                <TableHeaderCell>Crédit depuis</TableHeaderCell>
                <TableHeaderCell align="right">Montant dû</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.customerId}>
                  <TableCell>
                    <Link href={`/clients/${r.customerId}`} className="font-medium text-zinc-900 hover:text-emerald-600 dark:text-slate-100">
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{r.phone ?? "—"}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{formatDate(r.oldest)}</TableCell>
                  <TableCell align="right">
                    <Badge tone="red">{formatMoney(r.total, currency)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {upcomingInstallments.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Échéances à venir</h2>
          </CardHeader>
          <CardBody className="overflow-x-auto p-0">
            <Table className="min-w-[600px]">
              <TableHead>
                <TableRow interactive={false}>
                  <TableHeaderCell>Client</TableHeaderCell>
                  <TableHeaderCell>Vente</TableHeaderCell>
                  <TableHeaderCell>Échéance</TableHeaderCell>
                  <TableHeaderCell align="right">Montant restant</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {upcomingInstallments.map((i) => {
                  const isLate = new Date(i.dueDate) < new Date();
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Link href={`/clients/${i.customerId}`} className="font-medium text-zinc-900 hover:text-emerald-600 dark:text-slate-100">
                          {i.customerName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/ventes/${i.saleId}`} className="font-mono text-xs text-emerald-600 hover:underline">
                          {i.saleNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-slate-400">{formatDate(new Date(i.dueDate))}</TableCell>
                      <TableCell align="right">
                        <Badge tone={isLate ? "red" : "amber"}>{formatMoney(i.amount - i.paidAmount, currency)}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

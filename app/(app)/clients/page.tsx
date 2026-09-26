import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";
import { getActivityConfig, resolveTerm } from "@/lib/activity-config";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { ClientManager } from "./ClientManager";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  sales: Array<{ total: number; amountPaid: number; status: string }>;
};

export default async function CustomersPage() {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const [canManage, canSeeSales, activityConfig] = await Promise.all([
    hasPermission(user.businessId, user.role, PERMISSIONS.CUSTOMERS_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.SALES_CREATE, user.id),
    getActivityConfig(user.business.activityKey),
  ]);
  const clientsLabel = resolveTerm(activityConfig, "clients");

  const { data } = await supabase
    .from("customers")
    .select("id, name, phone, sales(total, amountPaid:amount_paid, status)")
    .eq("business_id", user.businessId)
    .order("name", { ascending: true });
  const customers = (data ?? []) as unknown as CustomerRow[];

  const currency = user.business.currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{clientsLabel}</h1>
          <p className="text-sm text-zinc-500">
            {customers.length} {clientsLabel.toLowerCase()}
          </p>
        </div>
        {canManage && <ClientManager />}
      </div>

      {customers.length === 0 ? (
        <EmptyState title="Aucun client" description="Ajoutez votre premier client." />
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>Nom</TableHeaderCell>
                <TableHeaderCell>Téléphone</TableHeaderCell>
                {canSeeSales && <TableHeaderCell align="right">Total acheté</TableHeaderCell>}
                <TableHeaderCell align="right">Crédit</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((c) => {
                const activeSales = c.sales.filter((s) => s.status !== "ANNULEE");
                const totalBought = activeSales.reduce((s, sale) => s + sale.total, 0);
                const credit = activeSales.reduce((s, sale) => s + Math.max(0, sale.total - sale.amountPaid), 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/clients/${c.id}`} className="font-medium text-zinc-900 hover:text-emerald-600 dark:text-slate-100">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-slate-400">{c.phone ?? "—"}</TableCell>
                    {canSeeSales && (
                      <TableCell align="right" className="text-zinc-900 tabular-nums dark:text-slate-100">
                        {formatMoney(totalBought, currency)}
                      </TableCell>
                    )}
                    <TableCell align="right" className="tabular-nums">
                      {credit > 0 ? (
                        <Badge tone="red">{formatMoney(credit, currency)}</Badge>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
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

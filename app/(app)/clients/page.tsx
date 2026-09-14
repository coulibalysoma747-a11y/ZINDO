import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/format";
import { getActivityConfig, resolveTerm } from "@/lib/activity-config";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
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
      <div className="flex items-center justify-between">
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
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Téléphone</th>
                {canSeeSales && <th className="px-4 py-3 text-right font-medium">Total acheté</th>}
                <th className="px-4 py-3 text-right font-medium">Crédit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {customers.map((c) => {
                const totalBought = c.sales.reduce((s, sale) => s + sale.total, 0);
                const credit = c.sales
                  .filter((s) => s.status !== "ANNULEE")
                  .reduce((s, sale) => s + (sale.total - sale.amountPaid), 0);
                return (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link href={`/clients/${c.id}`} className="font-medium text-zinc-900 hover:text-emerald-600">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{c.phone ?? "—"}</td>
                    {canSeeSales && (
                      <td className="px-4 py-3 text-right text-zinc-900">{formatMoney(totalBought, currency)}</td>
                    )}
                    <td className="px-4 py-3 text-right">
                      {credit > 0 ? (
                        <Badge tone="red">{formatMoney(credit, currency)}</Badge>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

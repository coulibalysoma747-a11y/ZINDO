import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { TABLE_ACTIVITIES } from "@/lib/nav";
import { ensureTablesFlagRegistered, isTablesModuleEnabled, getTableOrderAction } from "@/lib/actions/tables";
import { getEnabledPaymentMethods } from "@/lib/actions/sales";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { TableOrderItemsPanel } from "./TableOrderItemsPanel";
import { TableOrderCloseBar } from "./TableOrderCloseBar";

export default async function TableOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.TABLES_MANAGE);
  if (!user.business.activityKey || !TABLE_ACTIVITIES.includes(user.business.activityKey)) redirect("/dashboard");

  await ensureTablesFlagRegistered();
  if (!(await isTablesModuleEnabled(user.businessId))) redirect("/dashboard");

  const { id } = await params;
  const { data: table } = await supabase.from("restaurant_tables").select("id, name").eq("id", id).eq("business_id", user.businessId).maybeSingle();
  if (!table) {
    return <EmptyState title="Table introuvable" action={<ButtonLink href="/tables">Retour aux tables</ButtonLink>} />;
  }

  const order = await getTableOrderAction(id);
  if (!order) {
    return (
      <EmptyState
        title={`${table.name} est libre`}
        description="Ouvrez un compte depuis la liste des tables pour commencer à prendre des commandes."
        action={<ButtonLink href="/tables">Retour aux tables</ButtonLink>}
      />
    );
  }

  const [{ data: customers }, paymentMethods] = await Promise.all([
    supabase.from("customers").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    getEnabledPaymentMethods(),
  ]);

  const currency = user.business.currency;

  return (
    <div className="max-w-3xl space-y-6 pb-24">
      <div>
        <Link href="/tables" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Retour aux tables
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-zinc-500" />
          <h1 className="text-xl font-bold text-zinc-900">{table.name}</h1>
        </div>
        <p className="text-sm text-zinc-500">
          {order.number} · Ouvert à {formatDateTime(new Date(order.openedAt))}
          {order.customer && <> · {order.customer.name}</>}
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Commande</h2>
        </CardHeader>
        <CardBody>
          <TableOrderItemsPanel tableId={table.id} locationId={order.locationId} items={order.items} currency={currency} />
        </CardBody>
      </Card>

      <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4">
        <span className="text-sm text-zinc-500">Total</span>
        <span className="text-xl font-bold text-zinc-900">{formatMoney(order.total, currency)}</span>
      </div>

      <TableOrderCloseBar
        tableId={table.id}
        total={order.total}
        customers={customers ?? []}
        defaultCustomerId={order.customer?.id ?? ""}
        paymentMethods={paymentMethods}
        currency={currency}
      />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Scissors } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ARTISAN_ACTIVITY_KEY } from "@/lib/nav";
import { ensureCustomOrdersFlagRegistered, isCustomOrdersModuleEnabled, getCustomOrderAction } from "@/lib/actions/custom-orders";
import { CUSTOM_ORDER_STATUS_LABELS } from "@/lib/custom-order-status";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDateTime, formatDate } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { CustomOrderStatus } from "@/lib/db-types";
import { CustomOrderStatusActions } from "./CustomOrderStatusActions";
import { CustomOrderDetailsForm } from "./CustomOrderDetailsForm";
import { CustomOrderItemsPanel } from "./CustomOrderItemsPanel";
import { CustomOrderPaymentPanel } from "./CustomOrderPaymentPanel";

const STATUS_TONE: Record<CustomOrderStatus, "zinc" | "blue" | "amber" | "emerald" | "red"> = {
  EN_COURS: "blue",
  PRET: "amber",
  LIVRE: "emerald",
  ANNULE: "red",
};

export default async function CustomOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.CUSTOM_ORDERS_MANAGE);
  if (user.business.activityKey !== ARTISAN_ACTIVITY_KEY) redirect("/dashboard");

  await ensureCustomOrdersFlagRegistered();
  if (!(await isCustomOrdersModuleEnabled(user.businessId))) redirect("/dashboard");

  const { id } = await params;
  const order = await getCustomOrderAction(id);
  if (!order) notFound();

  const { data: technicians } = await supabase
    .from("users")
    .select("id, firstName:first_name, lastName:last_name")
    .eq("business_id", user.businessId)
    .eq("active", true)
    .order("first_name", { ascending: true });

  const currency = user.business.currency;
  const remaining = order.total - order.amountPaid;
  const closed = order.status === "LIVRE" || order.status === "ANNULE";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/commandes-sur-mesure" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="h-4 w-4" /> Retour aux commandes
          </Link>
          <div className="mt-1 flex items-center gap-2">
            <Scissors className="h-5 w-5 text-zinc-500" />
            <h1 className="text-xl font-bold text-zinc-900">
              {order.number} · {order.itemDescription}
            </h1>
            <Badge tone={STATUS_TONE[order.status]}>{CUSTOM_ORDER_STATUS_LABELS[order.status]}</Badge>
          </div>
          <p className="text-sm text-zinc-500">
            {order.customer.name} · {formatDateTime(new Date(order.createdAt))}
            {order.deliveryDate && <> · Livraison prévue le {formatDate(new Date(order.deliveryDate))}</>}
          </p>
        </div>
        {!closed && <CustomOrderStatusActions orderId={order.id} status={order.status} />}
      </div>

      {order.specifications && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Spécifications</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-zinc-700">{order.specifications}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Détails de la commande</h2>
        </CardHeader>
        <CardBody>
          <CustomOrderDetailsForm
            orderId={order.id}
            specifications={order.specifications}
            agreedPrice={order.agreedPrice}
            discount={order.discount}
            deliveryDate={order.deliveryDate}
            technicianId={order.technician?.id ?? ""}
            technicians={(technicians ?? []).map((t) => ({ id: t.id as string, name: `${t.firstName} ${t.lastName}` }))}
            currency={currency}
            disabled={closed}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Matières & fournitures utilisées</h2>
        </CardHeader>
        <CardBody>
          <CustomOrderItemsPanel orderId={order.id} items={order.items} locationId={order.locationId} currency={currency} disabled={closed} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Facturation</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Info label="Prix convenu" value={formatMoney(order.agreedPrice, currency)} />
            <Info label="Matières" value={formatMoney(order.items.reduce((s, i) => s + i.total, 0), currency)} />
            <Info label="Remise" value={`- ${formatMoney(order.discount, currency)}`} />
            <Info label="Total" value={formatMoney(order.total, currency)} />
          </div>
          <CustomOrderPaymentPanel orderId={order.id} amountPaid={order.amountPaid} remaining={remaining} currency={currency} />
        </CardBody>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-zinc-400">{label}</p>
      <p className="font-medium text-zinc-900">{value}</p>
    </div>
  );
}

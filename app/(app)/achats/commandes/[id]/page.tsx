import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { isPurchaseOrdersModuleEnabled } from "@/lib/actions/purchase-orders";
import {
  PURCHASE_ORDER_STATUS_LABELS,
  PURCHASE_ORDER_STATUS_TONES,
  purchaseOrderDisplayNumber,
  type PurchaseOrderStatus,
} from "@/lib/purchase-orders";
import { Badge } from "@/components/ui/Badge";
import { purchaseOrderShareUrl } from "@/lib/purchase-order-document";
import { OrderWorkflow, type OrderDetail, type GroupOffer } from "./OrderWorkflow";

type ItemRow = {
  id: string;
  quantity: number;
  unitPrice: number | null;
  receivedQuantity: number | null;
  product: { id: string; name: string; reference: string; unit: string; unitsPerCarton: number | null };
};

const ORDER_SELECT =
  "id, number, groupNumber:group_number, status, transportCost:transport_cost, discount, responseBy:response_by, expectedDeliveryDate:expected_delivery_date, deliveryPlace:delivery_place, paymentTerms:payment_terms, deposit, note, purchaseId:purchase_id, createdAt:created_at, supplier:suppliers(id, name, phone), location:locations(name), items:purchase_order_items(id, quantity, unitPrice:unit_price, receivedQuantity:received_quantity, position, product:products(id, name, reference, unit, unitsPerCarton:units_per_carton))";

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);
  if (!(await isPurchaseOrdersModuleEnabled(user.businessId))) notFound();

  const { data } = await supabase.from("purchase_orders").select(ORDER_SELECT).eq("id", id).eq("business_id", user.businessId).maybeSingle();
  if (!data) notFound();
  const order = data as unknown as Omit<OrderDetail, "items"> & {
    createdAt: string;
    groupNumber: string;
    items: (ItemRow & { position: number })[];
  };
  order.items.sort((a, b) => a.position - b.position);

  const [{ data: siblings }, { data: suppliers }] = await Promise.all([
    supabase
      .from("purchase_orders")
      .select("id, number, status, transportCost:transport_cost, discount, supplier:suppliers(id, name), items:purchase_order_items(quantity, unitPrice:unit_price, productId:product_id)")
      .eq("business_id", user.businessId)
      .eq("group_number", order.groupNumber),
    supabase.from("suppliers").select("id, name").eq("business_id", user.businessId).order("name"),
  ]);
  const group = (siblings ?? []) as unknown as GroupOffer[];
  group.sort((a, b) => a.number.localeCompare(b.number));

  const status = order.status as PurchaseOrderStatus;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/achats/commandes" className="text-xs text-zinc-500 hover:underline">
            ← Demandes et bons de commande
          </Link>
          <h1 className="mt-1 font-mono text-xl font-bold text-zinc-900 dark:text-slate-100">
            {purchaseOrderDisplayNumber(order.number, status)}
          </h1>
          <p className="text-sm text-zinc-500">
            {order.supplier.name} · Livraison : {order.location.name} · Créée le {formatDateTime(new Date(order.createdAt))}
          </p>
        </div>
        <Badge tone={PURCHASE_ORDER_STATUS_TONES[status]}>{PURCHASE_ORDER_STATUS_LABELS[status]}</Badge>
      </div>

      <OrderWorkflow
        order={order}
        group={group}
        suppliers={(suppliers ?? []) as { id: string; name: string }[]}
        currency={user.business.currency}
        shareUrl={purchaseOrderShareUrl(order.id)}
      />
    </div>
  );
}

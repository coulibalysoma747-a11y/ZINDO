import Link from "next/link";
import { ArrowLeft, Truck } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { OrderStatusControls } from "./OrderStatusControls";

const STATUS_TONE = {
  EN_ATTENTE: "amber",
  CONFIRMEE: "blue",
  LIVREE: "emerald",
  ANNULEE: "zinc",
} as const;

const STATUS_LABELS = {
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmée",
  LIVREE: "Livrée",
  ANNULEE: "Annulée",
} as const;

export default async function OnlineOrdersPage() {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const store = await prisma.onlineStore.findUnique({ where: { businessId: user.businessId } });
  const orders = store
    ? await prisma.onlineOrder.findMany({
        where: { storeId: store.id },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      })
    : [];

  const currency = user.business.currency;
  const sorted = [...orders].sort((a, b) => {
    if (a.status === "EN_ATTENTE" && b.status !== "EN_ATTENTE") return -1;
    if (a.status !== "EN_ATTENTE" && b.status === "EN_ATTENTE") return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/boutique-en-ligne" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" /> Retour à la boutique en ligne
      </Link>

      <div>
        <h1 className="text-xl font-bold text-zinc-900">Commandes en ligne</h1>
        <p className="text-sm text-zinc-500">{orders.length} commande(s) reçue(s)</p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="Aucune commande pour le moment"
          description="Les commandes passées depuis votre boutique en ligne apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((order) => (
            <Card key={order.id}>
              <CardBody className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900">
                      {order.number} — {order.customerName}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {order.customerPhone} — {formatDateTime(order.createdAt)}
                    </p>
                    {order.wantsDelivery && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                        <Truck className="h-3 w-3" /> Livraison : {order.deliveryAddress}
                      </p>
                    )}
                    {order.note && <p className="mt-0.5 text-xs italic text-zinc-400">« {order.note} »</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABELS[order.status]}</Badge>
                    <OrderStatusControls orderId={order.id} status={order.status} />
                  </div>
                </div>

                <table className="w-full text-sm">
                  <tbody className="divide-y divide-zinc-100">
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-1 text-zinc-700">{item.product.name}</td>
                        <td className="py-1 text-right text-zinc-500">
                          {item.quantity} × {formatMoney(item.unitPrice, currency)}
                        </td>
                        <td className="py-1 text-right font-medium text-zinc-900">
                          {formatMoney(item.total, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end gap-4 border-t border-zinc-100 pt-2 text-sm">
                  <span className="text-zinc-500">Sous-total {formatMoney(order.subtotal, currency)}</span>
                  {order.deliveryFee > 0 && (
                    <span className="text-zinc-500">Livraison {formatMoney(order.deliveryFee, currency)}</span>
                  )}
                  <span className="font-bold text-zinc-900">Total {formatMoney(order.total, currency)}</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { vignette } from "@/lib/vignette";
import { Package } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { isMarketEnabledFor } from "@/lib/market-data";
import { MARKET_PAYMENT_LABELS, marketOrderStatusLabel } from "@/lib/market";
import { formatMoney, formatDateTime } from "@/lib/format";
import { OrderStatusBadge } from "@/components/market/OrderStatusBadge";
import { OrderStatusActions } from "./OrderStatusActions";

type OrderRow = {
  id: string;
  number: string;
  status: string;
  customerName: string;
  customerPhone: string;
  deliveryMode: "LIVRAISON" | "RETRAIT";
  deliveryAddress: string | null;
  deliveryCity: string | null;
  paymentMethod: string;
  mobileMoneyOperator: string | null;
  mobileMoneyReference: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  buyerNote: string | null;
  cancelReason: string | null;
  saleId: string | null;
  createdAt: string;
  items: { name: string; photoUrl: string | null; unitPrice: number; quantity: number }[];
};

export default async function MarketOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  if (!(await isMarketEnabledFor(user.businessId, user.business.activityKey))) redirect("/dashboard");
  const { id } = await params;

  const { data } = await supabase
    .from("market_orders")
    .select(
      "id, number, status, customerName:customer_name, customerPhone:customer_phone, deliveryMode:delivery_mode, deliveryAddress:delivery_address, deliveryCity:delivery_city, " +
        "paymentMethod:payment_method, mobileMoneyOperator:mobile_money_operator, mobileMoneyReference:mobile_money_reference, subtotal, deliveryFee:delivery_fee, total, buyerNote:buyer_note, cancelReason:cancel_reason, saleId:sale_id, createdAt:created_at, " +
        "items:market_order_items(name, photoUrl:photo_url, unitPrice:unit_price, quantity)"
    )
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  const order = data as unknown as OrderRow | null;
  if (!order) notFound();
  const currency = user.business.currency;

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/mon-marche/commandes" className="text-sm text-zinc-500 hover:underline">
        ← Commandes du Marché
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{order.number}</h1>
          <p className="text-xs text-zinc-500">{formatDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} label={marketOrderStatusLabel(order.status)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1 rounded-2xl bg-white p-5 text-sm ring-1 ring-zinc-200">
          <p className="font-semibold text-zinc-900">Client</p>
          <p>{order.customerName}</p>
          <a href={`tel:${order.customerPhone}`} className="text-zindo-green-700 underline">
            {order.customerPhone}
          </a>
          <p className="pt-2 text-zinc-600">
            {order.deliveryMode === "LIVRAISON" ? `Livraison : ${[order.deliveryAddress, order.deliveryCity].filter(Boolean).join(", ")}` : "Retrait en boutique"}
          </p>
          {order.buyerNote && <p className="rounded-lg bg-zinc-50 p-2 text-zinc-700">Message du client : {order.buyerNote}</p>}
        </div>
        <div className="space-y-1 rounded-2xl bg-white p-5 text-sm ring-1 ring-zinc-200">
          <p className="font-semibold text-zinc-900">Paiement</p>
          <p>{MARKET_PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
          {order.paymentMethod === "MOBILE_MONEY" && (
            <p className="rounded-lg bg-amber-50 p-2 text-amber-900">
              {order.mobileMoneyOperator === "MOOV" ? "Moov Money" : "Orange Money"} — référence : <strong>{order.mobileMoneyReference}</strong>
              <br />
              Vérifiez la réception du transfert avant de confirmer.
            </p>
          )}
          {order.saleId && (
            <Link href={`/ventes/${order.saleId}`} className="block pt-2 font-semibold text-zindo-green-700 underline">
              Voir la vente enregistrée
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 text-sm">
            {item.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vignette(item.photoUrl, 48)} loading="lazy" decoding="async" alt="" className="h-12 w-12 rounded-lg object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100"><Package className="h-5 w-5 text-zinc-400" /></span>
            )}
            <span className="flex-1">{item.name}</span>
            <span className="text-zinc-500">
              {formatMoney(item.unitPrice, currency)} ×{item.quantity}
            </span>
            <span className="font-semibold">{formatMoney(item.unitPrice * item.quantity, currency)}</span>
          </div>
        ))}
        <div className="space-y-1 border-t border-zinc-100 pt-2 text-sm">
          <div className="flex justify-between text-zinc-600">
            <span>Sous-total</span>
            <span>{formatMoney(order.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span>Livraison</span>
            <span>{formatMoney(order.deliveryFee, currency)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{formatMoney(order.total, currency)}</span>
          </div>
        </div>
      </div>

      {order.status === "ANNULEE" && order.cancelReason && <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{order.cancelReason}</p>}
      {order.status !== "LIVREE" && order.status !== "ANNULEE" && (
        <OrderStatusActions orderId={order.id} status={order.status} deliveryMode={order.deliveryMode} />
      )}
    </div>
  );
}

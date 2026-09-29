import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, Package, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCurrentBuyer } from "@/lib/market-buyer";
import { MARKET_ORDER_STEPS, MARKET_PAYMENT_LABELS, marketOrderStatusLabel } from "@/lib/market";
import { formatMoney, formatDateTime } from "@/lib/format";
import { OrderStatusBadge } from "@/components/market/OrderStatusBadge";
import { CancelMyOrderButton } from "./CancelMyOrderButton";
import { ReviewForm } from "./ReviewForm";
import { ContactSellerButton } from "@/components/market/ContactSellerButton";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  number: string;
  status: string;
  deliveryMode: "LIVRAISON" | "RETRAIT";
  deliveryAddress: string | null;
  deliveryCity: string | null;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  currency: string;
  cancelReason: string | null;
  createdAt: string;
  shopId: string;
  shop: { name: string; slug: string; phone: string | null; whatsapp: string | null; address: string | null; city: string | null };
  items: { productId: string; name: string; photoUrl: string | null; unitPrice: number; quantity: number }[];
  events: { status: string; createdAt: string }[];
};

export default async function MarketOrderTrackingPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const buyer = await getCurrentBuyer();
  if (!buyer) redirect(`/marche/compte?suite=/marche/commandes/${encodeURIComponent(number)}`);

  const { data } = await supabase
    .from("market_orders")
    .select(
      "id, number, status, currency, shopId:shop_id, deliveryMode:delivery_mode, deliveryAddress:delivery_address, deliveryCity:delivery_city, paymentMethod:payment_method, subtotal, deliveryFee:delivery_fee, total, cancelReason:cancel_reason, createdAt:created_at, " +
        "shop:market_shops(name, slug, phone, whatsapp, address, city), items:market_order_items(productId:product_id, name, photoUrl:photo_url, unitPrice:unit_price, quantity), events:market_order_events(status, createdAt:created_at)"
    )
    .eq("number", number)
    .eq("buyer_id", buyer.id)
    .maybeSingle();
  const order = data as unknown as OrderRow | null;
  if (!order) notFound();

  // Pour un retrait, l'étape « En livraison » n'a pas de sens.
  const steps = MARKET_ORDER_STEPS.filter((s) => order.deliveryMode === "LIVRAISON" || s.key !== "EN_LIVRAISON");
  const reachedAt = new Map(order.events.map((e) => [e.status, e.createdAt]));
  const currentIndex = steps.findIndex((s) => s.key === order.status);
  const contact = order.shop.whatsapp || order.shop.phone;
  const { data: reviewData } =
    order.status === "LIVREE" ? await supabase.from("market_reviews").select("productId:product_id, rating, comment").eq("order_id", order.id) : { data: [] };
  const reviewByProduct = new Map(
    ((reviewData ?? []) as { productId: string; rating: number; comment: string | null }[]).map((r) => [r.productId, { rating: r.rating, comment: r.comment }])
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/marche/commandes" className="text-sm text-zinc-500 hover:underline">
        ← Mes commandes
      </Link>
      <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
        <p className="text-xs text-zinc-500">Commande</p>
        <p className="text-xl font-bold text-zinc-900">{order.number}</p>
        <p className="text-xs text-zinc-500">Passée le {formatDateTime(order.createdAt)}</p>
        <OrderStatusBadge status={order.status} label={marketOrderStatusLabel(order.status)} />
        {order.status === "ANNULEE" && order.cancelReason && <p className="mt-2 text-sm text-red-700">{order.cancelReason}</p>}
      </div>

      {order.status !== "ANNULEE" && (
        <ol className="space-y-0 rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          {steps.map((step, i) => {
            const done = i <= currentIndex;
            return (
              <li key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={done ? "flex h-7 w-7 items-center justify-center rounded-full bg-zindo-green-600 text-white" : "h-7 w-7 rounded-full border-2 border-zinc-200 bg-white"}>
                    {done && <Check className="h-4 w-4" />}
                  </span>
                  {i < steps.length - 1 && <span className={done && i < currentIndex ? "h-8 w-0.5 bg-zindo-green-600" : "h-8 w-0.5 bg-zinc-200"} />}
                </div>
                <div className="pb-3">
                  <p className={done ? "text-sm font-semibold text-zinc-900" : "text-sm text-zinc-400"}>{step.label}</p>
                  {reachedAt.get(step.key) && <p className="text-xs text-zinc-500">{formatDateTime(reachedAt.get(step.key)!)}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
        <p className="flex items-center gap-2 text-sm font-bold text-zinc-900"><Store className="h-4 w-4 text-zinc-500" /> {order.shop.name}</p>
        {order.items.map((item, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              {item.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100"><Package className="h-5 w-5 text-zinc-400" /></span>
              )}
              <span className="flex-1">{item.name}</span>
              <span className="text-zinc-500">×{item.quantity}</span>
              <span className="font-semibold">{formatMoney(item.unitPrice * item.quantity, order.currency)}</span>
            </div>
            {order.status === "LIVREE" && <ReviewForm orderId={order.id} productId={item.productId} initial={reviewByProduct.get(item.productId) ?? null} />}
          </div>
        ))}
        <div className="space-y-1 border-t border-zinc-100 pt-2 text-sm">
          <div className="flex justify-between text-zinc-600">
            <span>Sous-total</span>
            <span>{formatMoney(order.subtotal, order.currency)}</span>
          </div>
          <div className="flex justify-between text-zinc-600">
            <span>Livraison</span>
            <span>{formatMoney(order.deliveryFee, order.currency)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-zindo-green-700">{formatMoney(order.total, order.currency)}</span>
          </div>
        </div>
        <p className="text-sm text-zinc-600">
          {order.deliveryMode === "LIVRAISON"
            ? `Livraison : ${[order.deliveryAddress, order.deliveryCity].filter(Boolean).join(", ")}`
            : `Retrait : ${[order.shop.address, order.shop.city].filter(Boolean).join(", ") || "à la boutique"}`}
        </p>
        <p className="text-sm text-zinc-600">Paiement : {MARKET_PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <ContactSellerButton shopId={order.shopId} orderId={order.id} />
        {contact && (
          <a href={order.shop.whatsapp ? `https://wa.me/${order.shop.whatsapp.replace(/\D/g, "").replace(/^(\d{8})$/, "226$1")}?text=${encodeURIComponent(`Bonjour, au sujet de ma commande ${order.number}.`)}` : `tel:${order.shop.phone}`} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-xl border border-zinc-300 bg-white py-2.5 text-center text-sm font-semibold text-zinc-800">
            {order.shop.whatsapp ? "WhatsApp" : "Appeler"}
          </a>
        )}
        {order.status === "RECUE" && <CancelMyOrderButton orderId={order.id} />}
      </div>
    </div>
  );
}

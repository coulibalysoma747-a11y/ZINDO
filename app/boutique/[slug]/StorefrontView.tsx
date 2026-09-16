"use client";

import { useMemo, useState } from "react";
import { ShoppingBasket, Plus, Minus, Trash2, Truck, Store, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { createOnlineOrderAction } from "@/lib/actions/online-store-public";

type Product = {
  id: string;
  name: string;
  unit: string;
  salePrice: number;
  photoUrl: string | null;
  available: number;
};

type Store = {
  slug: string;
  storeName: string;
  tagline: string | null;
  description: string | null;
  coverPhotoUrl: string | null;
  contactPhone: string | null;
  whatsappNumber: string | null;
  address: string | null;
  city: string | null;
  footerMessage: string | null;
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeDeliveryAbove: number | null;
  deliveryNote: string | null;
  pickupEnabled: boolean;
  payOnDeliveryEnabled: boolean;
  mobileMoneyEnabled: boolean;
  mobileMoneyNumber: string | null;
  minOrderAmount: number;
  currency: string;
  businessName: string;
};

export function StorefrontView({ store, products }: { store: Store; products: Product[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [wantsDelivery, setWantsDelivery] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const cartItems = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([productId, qty]) => ({ product: productMap.get(productId)!, qty }))
    .filter((i) => i.product);

  const subtotal = cartItems.reduce((sum, i) => sum + i.product.salePrice * i.qty, 0);
  const deliveryFee =
    wantsDelivery && store.deliveryEnabled
      ? store.freeDeliveryAbove != null && subtotal >= store.freeDeliveryAbove
        ? 0
        : store.deliveryFee
      : 0;
  const total = subtotal + deliveryFee;
  const itemCount = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const belowMinimum = store.minOrderAmount > 0 && subtotal > 0 && subtotal < store.minOrderAmount;

  const paymentMethods = [
    store.payOnDeliveryEnabled ? "Paiement à la livraison / sur place" : null,
    store.mobileMoneyEnabled ? `Mobile Money${store.mobileMoneyNumber ? ` (${store.mobileMoneyNumber})` : ""}` : null,
  ].filter((m): m is string => !!m);

  function setQty(productId: string, qty: number, max: number) {
    const clamped = Math.max(0, Math.min(qty, max));
    setCart((c) => ({ ...c, [productId]: clamped }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (cartItems.length === 0) {
      setError("Votre panier est vide");
      return;
    }
    if (belowMinimum) {
      setError(`Commande minimum : ${formatMoney(store.minOrderAmount, store.currency)}`);
      return;
    }
    if (wantsDelivery && !deliveryAddress.trim()) {
      setError("Indiquez une adresse de livraison");
      return;
    }
    setSubmitting(true);
    const result = await createOnlineOrderAction({
      slug: store.slug,
      customerName,
      customerPhone,
      deliveryAddress: wantsDelivery ? deliveryAddress : undefined,
      wantsDelivery,
      note: note || undefined,
      items: cartItems.map((i) => ({ productId: i.product.id, quantity: i.qty })),
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOrderNumber(result.orderNumber);
    setCart({});
  }

  if (orderNumber) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <h1 className="text-xl font-bold text-zinc-900">Commande envoyée !</h1>
        <p className="text-sm text-zinc-500">
          Votre commande <span className="font-semibold text-zinc-900">{orderNumber}</span> a bien été reçue par{" "}
          {store.businessName}. Ils vous contacteront bientôt au numéro fourni pour confirmer.
        </p>
        <button
          onClick={() => setOrderNumber(null)}
          className="mt-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          Continuer mes achats
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-28">
      <header className="border-b border-zinc-200 bg-white">
        {store.coverPhotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.coverPhotoUrl} alt={store.storeName} className="h-32 w-full object-cover sm:h-48" />
        )}
        <div className="px-4 py-6">
          <div className="flex items-center gap-2 text-orange-500">
            <ShoppingBasket className="h-6 w-6" />
            <span className="text-xs font-semibold uppercase tracking-wide">Boutique en ligne</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">{store.storeName}</h1>
          {store.tagline && <p className="mt-0.5 text-sm font-medium text-orange-600">{store.tagline}</p>}
          {store.description && <p className="mt-1 text-sm text-zinc-500">{store.description}</p>}
          {(store.address || store.city) && (
            <p className="mt-1 text-sm text-zinc-500">{[store.address, store.city].filter(Boolean).join(", ")}</p>
          )}
          {(store.contactPhone || store.whatsappNumber) && (
            <p className="mt-1 text-sm text-zinc-500">
              Contact : {[store.contactPhone, store.whatsappNumber && `WhatsApp ${store.whatsappNumber}`].filter(Boolean).join(" — ")}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {store.deliveryEnabled && (
              <span className="flex items-center gap-1 text-xs text-emerald-700">
                <Truck className="h-3.5 w-3.5" /> Livraison disponible
              </span>
            )}
            {store.pickupEnabled && (
              <span className="flex items-center gap-1 text-xs text-emerald-700">
                <Store className="h-3.5 w-3.5" /> Retrait en boutique
              </span>
            )}
          </div>
          {paymentMethods.length > 0 && (
            <p className="mt-1 text-xs text-zinc-400">Paiement : {paymentMethods.join(" · ")}</p>
          )}
          {store.minOrderAmount > 0 && (
            <p className="mt-1 text-xs text-zinc-400">
              Commande minimum : {formatMoney(store.minOrderAmount, store.currency)}
            </p>
          )}
        </div>
      </header>

      {products.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-zinc-500">Aucun produit disponible pour le moment.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {products.map((p) => {
            const qty = cart[p.id] ?? 0;
            const outOfStock = p.available <= 0;
            return (
              <div
                key={p.id}
                className={`flex flex-col rounded-lg border border-zinc-200 bg-white p-3 ${outOfStock ? "opacity-50" : ""}`}
              >
                <div className="relative mb-2 flex h-20 items-center justify-center overflow-hidden rounded bg-zinc-100">
                  {p.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photoUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <ShoppingBasket className="h-6 w-6 text-zinc-300" />
                  )}
                  {outOfStock && (
                    <span className="absolute inset-x-0 bottom-0 bg-zinc-900/70 py-0.5 text-center text-[10px] font-semibold text-white">
                      Rupture
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-sm font-medium text-zinc-900">{p.name}</p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {formatMoney(p.salePrice, store.currency)} / {p.unit}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  {outOfStock ? (
                    <span className="w-full py-1.5 text-center text-xs font-medium text-zinc-400">Indisponible</span>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => setQty(p.id, 1, p.available)}
                      className="w-full rounded-md bg-orange-500 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
                    >
                      Ajouter
                    </button>
                  ) : (
                    <div className="flex w-full items-center justify-between rounded-md border border-orange-200">
                      <button
                        onClick={() => setQty(p.id, qty - 1, p.available)}
                        className="p-1.5 text-orange-600"
                        aria-label="Diminuer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-xs font-semibold text-zinc-900">{qty}</span>
                      <button
                        onClick={() => setQty(p.id, qty + 1, p.available)}
                        disabled={qty >= p.available}
                        className="p-1.5 text-orange-600 disabled:opacity-30"
                        aria-label="Augmenter"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {store.footerMessage && (
        <p className="px-4 pb-4 text-center text-xs text-zinc-400">{store.footerMessage}</p>
      )}

      {itemCount > 0 && !checkoutOpen && (
        <div className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white p-3">
          <button
            onClick={() => setCheckoutOpen(true)}
            className="mx-auto flex w-full max-w-3xl items-center justify-between rounded-lg bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600"
          >
            <span>
              {itemCount} article{itemCount > 1 ? "s" : ""}
            </span>
            <span>Commander — {formatMoney(subtotal, store.currency)}</span>
          </button>
        </div>
      )}

      {checkoutOpen && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
            <h2 className="text-lg font-bold text-zinc-900">Votre commande</h2>

            <div className="mt-3 space-y-2 border-b border-zinc-100 pb-3">
              {cartItems.map((i) => (
                <div key={i.product.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty(i.product.id, 0, i.product.available)}
                      className="text-zinc-400 hover:text-red-500"
                      aria-label="Retirer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-zinc-700">
                      {i.qty} × {i.product.name}
                    </span>
                  </div>
                  <span className="font-medium text-zinc-900">
                    {formatMoney(i.product.salePrice * i.qty, store.currency)}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Votre nom</label>
                <input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Votre téléphone</label>
                <input
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>

              {store.deliveryEnabled && (
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={wantsDelivery}
                    onChange={(e) => setWantsDelivery(e.target.checked)}
                    className="h-4 w-4 rounded accent-orange-500"
                  />
                  Je souhaite être livré
                </label>
              )}
              {wantsDelivery && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">Adresse de livraison</label>
                  <input
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                  {store.deliveryNote && <p className="mt-1 text-xs text-zinc-400">{store.deliveryNote}</p>}
                </div>
              )}
              {!wantsDelivery && store.pickupEnabled && (
                <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Store className="h-3.5 w-3.5" /> À retirer en boutique
                </p>
              )}
              {paymentMethods.length > 0 && (
                <p className="text-xs text-zinc-500">Paiement : {paymentMethods.join(" ou ")}</p>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">Note (facultatif)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1 border-t border-zinc-100 pt-2 text-sm">
                <div className="flex justify-between text-zinc-500">
                  <span>Sous-total</span>
                  <span>{formatMoney(subtotal, store.currency)}</span>
                </div>
                {wantsDelivery && (
                  <div className="flex justify-between text-zinc-500">
                    <span>Livraison</span>
                    <span>{deliveryFee === 0 ? "Gratuite" : formatMoney(deliveryFee, store.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-zinc-900">
                  <span>Total</span>
                  <span>{formatMoney(total, store.currency)}</span>
                </div>
              </div>

              {belowMinimum && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Commande minimum : {formatMoney(store.minOrderAmount, store.currency)}
                </p>
              )}
              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(false)}
                  className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium text-zinc-700"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={submitting || belowMinimum}
                  className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
                >
                  {submitting ? "Envoi..." : "Confirmer la commande"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

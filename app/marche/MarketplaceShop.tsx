"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, MapPin, Minus, Plus, ShoppingCart, Store, Trash2, X } from "lucide-react";
import { createOnlineOrderAction } from "@/lib/actions/online-store-public";
import { formatMoney } from "@/lib/format";

export type MarketStore = {
  slug: string;
  storeName: string;
  city: string | null;
  currency: string;
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeDeliveryAbove: number | null;
  pickupEnabled: boolean;
  minOrderAmount: number;
};

export type MarketOffer = {
  productId: string;
  name: string;
  salePrice: number;
  photoUrl: string | null;
  available: number;
  storeSlug: string;
};

type CartLine = { productId: string; storeSlug: string; name: string; salePrice: number; available: number; quantity: number };
type OrderOutcome = { storeName: string; ok: boolean; message: string };

const CART_KEY = "zindo-marche-panier";

function loadCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function saveCart(cart: CartLine[]) {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // Stockage indisponible (navigation privée…) : le panier reste en mémoire.
  }
}

export function MarketplaceShop({ offers, stores }: { offers: MarketOffer[]; stores: MarketStore[] }) {
  const storeMap = useMemo(() => new Map(stores.map((s) => [s.slug, s])), [stores]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wantsDelivery, setWantsDelivery] = useState(false);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<OrderOutcome[] | null>(null);

  // Lecture du panier sauvegardé après le montage seulement (localStorage absent côté serveur).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(loadCart());
  }, []);
  const update = (next: CartLine[]) => {
    setCart(next);
    saveCart(next);
  };

  const key = (l: { productId: string; storeSlug: string }) => `${l.storeSlug}:${l.productId}`;
  const inCart = new Map(cart.map((l) => [key(l), l.quantity]));

  function add(o: MarketOffer) {
    const existing = cart.find((l) => key(l) === key(o));
    if (existing) {
      if (existing.quantity >= o.available) return;
      update(cart.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l)));
    } else {
      update([...cart, { productId: o.productId, storeSlug: o.storeSlug, name: o.name, salePrice: o.salePrice, available: o.available, quantity: 1 }]);
    }
  }

  function setQty(line: CartLine, quantity: number) {
    if (quantity <= 0) update(cart.filter((l) => l !== line));
    else update(cart.map((l) => (l === line ? { ...l, quantity: Math.min(quantity, l.available) } : l)));
  }

  // Panier regroupé par boutique : une commande sera créée par boutique.
  const groups = useMemo(() => {
    const m = new Map<string, CartLine[]>();
    for (const l of cart) {
      if (!storeMap.has(l.storeSlug)) continue;
      m.set(l.storeSlug, [...(m.get(l.storeSlug) ?? []), l]);
    }
    return [...m.entries()].map(([slug, lines]) => {
      const store = storeMap.get(slug)!;
      const subtotal = lines.reduce((s, l) => s + l.salePrice * l.quantity, 0);
      const delivers = wantsDelivery && store.deliveryEnabled;
      const fee = delivers ? (store.freeDeliveryAbove != null && subtotal >= store.freeDeliveryAbove ? 0 : store.deliveryFee) : 0;
      return { store, lines, subtotal, delivers, fee };
    });
  }, [cart, storeMap, wantsDelivery]);

  const count = cart.reduce((s, l) => s + l.quantity, 0);
  const currency = stores[0]?.currency ?? "XOF";
  const grandTotal = groups.reduce((s, g) => s + g.subtotal + g.fee, 0);

  async function checkout() {
    setError(null);
    if (!name.trim() || phone.trim().length < 6) return setError("Indiquez votre nom et un numéro de téléphone valide.");
    if (wantsDelivery && !address.trim()) return setError("Indiquez votre adresse de livraison.");
    const tooSmall = groups.find((g) => g.store.minOrderAmount > 0 && g.subtotal < g.store.minOrderAmount);
    if (tooSmall) {
      return setError(
        `${tooSmall.store.storeName} demande une commande minimum de ${formatMoney(tooSmall.store.minOrderAmount, currency)}.`
      );
    }

    setPending(true);
    const results: OrderOutcome[] = [];
    const ordered = new Set<string>();
    for (const g of groups) {
      try {
        const res = await createOnlineOrderAction({
          slug: g.store.slug,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          wantsDelivery: g.delivers,
          deliveryAddress: g.delivers ? address.trim() : undefined,
          note: ["Commande passée sur le Marché ZINDO", note.trim()].filter(Boolean).join(" — "),
          items: g.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        });
        if (res.success) {
          ordered.add(g.store.slug);
          results.push({ storeName: g.store.storeName, ok: true, message: `Commande n° ${res.orderNumber} envoyée` });
        } else {
          results.push({ storeName: g.store.storeName, ok: false, message: res.error });
        }
      } catch {
        results.push({ storeName: g.store.storeName, ok: false, message: "Erreur réseau, réessayez." });
      }
    }
    // On ne garde dans le panier que les articles des boutiques où la commande a échoué.
    update(cart.filter((l) => !ordered.has(l.storeSlug)));
    setOutcomes(results);
    setPending(false);
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {offers.map((o) => {
          const store = storeMap.get(o.storeSlug)!;
          const qty = inCart.get(key(o)) ?? 0;
          return (
            <li key={key(o)} className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              <div className="flex aspect-square items-center justify-center bg-zinc-100">
                {o.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.photoUrl} alt={o.name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-10 w-10 text-zinc-300" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="line-clamp-2 text-sm font-semibold text-zindo-ink-900">{o.name}</p>
                <p className="mt-1 text-base font-extrabold text-zindo-green-600">{formatMoney(o.salePrice, store.currency)}</p>
                <Link href={`/boutique/${store.slug}`} className="mt-1 text-xs text-zinc-500 hover:text-zindo-green-600">
                  {store.storeName}
                  {store.city && (
                    <span className="ml-1 inline-flex items-center gap-0.5">
                      · <MapPin className="h-3 w-3" /> {store.city}
                    </span>
                  )}
                </Link>
                <div className="mt-auto pt-3">
                  {o.available <= 0 ? (
                    <p className="text-xs font-semibold text-red-600">Rupture de stock</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => add(o)}
                      disabled={qty >= o.available}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-zindo-green-500 px-3 py-2 text-sm font-bold text-white hover:bg-zindo-green-600 disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4" /> {qty > 0 ? `Ajouté (${qty})` : "Ajouter"}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {count > 0 && !open && (
        <button
          type="button"
          onClick={() => {
            setOutcomes(null);
            setOpen(true);
          }}
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-zindo-ink-900 px-6 py-3.5 text-sm font-bold text-white shadow-xl"
        >
          <ShoppingCart className="h-5 w-5" /> Panier ({count}) · {formatMoney(grandTotal, currency)}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => !pending && setOpen(false)}>
          <div className="flex h-full w-full max-w-md flex-col bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 className="text-lg font-extrabold text-zindo-ink-900">Mon panier</h2>
              <button type="button" onClick={() => setOpen(false)} disabled={pending} aria-label="Fermer">
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {outcomes && (
                <ul className="mb-4 space-y-2">
                  {outcomes.map((r) => (
                    <li
                      key={r.storeName}
                      className={`rounded-xl px-3 py-2 text-sm ${r.ok ? "bg-zindo-green-100 text-zindo-green-700" : "bg-red-50 text-red-700"}`}
                    >
                      {r.ok && <CheckCircle2 className="mr-1 inline h-4 w-4" />}
                      <strong>{r.storeName}</strong> : {r.message}
                    </li>
                  ))}
                  {outcomes.some((r) => r.ok) && (
                    <li className="text-xs text-zinc-500">Chaque boutique vous contactera par téléphone pour confirmer.</li>
                  )}
                </ul>
              )}

              {groups.length === 0 && !outcomes && <p className="py-10 text-center text-zinc-500">Votre panier est vide.</p>}

              {groups.map((g) => (
                <section key={g.store.slug} className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{g.store.storeName}</p>
                  <ul className="mt-2 space-y-2">
                    {g.lines.map((l) => (
                      <li key={key(l)} className="flex items-center gap-2 text-sm">
                        <span className="flex-1">{l.name}</span>
                        <button type="button" onClick={() => setQty(l, l.quantity - 1)} aria-label="Moins" className="rounded-lg border p-1">
                          {l.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        </button>
                        <span className="w-6 text-center font-semibold">{l.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQty(l, l.quantity + 1)}
                          disabled={l.quantity >= l.available}
                          aria-label="Plus"
                          className="rounded-lg border p-1 disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-24 text-right font-semibold">{formatMoney(l.salePrice * l.quantity, currency)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-right text-xs text-zinc-500">
                    {g.delivers
                      ? `Livraison : ${g.fee ? formatMoney(g.fee, currency) : "gratuite"}`
                      : wantsDelivery
                        ? "Pas de livraison : à retirer en boutique"
                        : "À retirer en boutique"}
                  </p>
                </section>
              ))}

              {groups.length > 0 && (
                <div className="space-y-3 border-t border-zinc-200 pt-4">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Téléphone (WhatsApp)"
                    inputMode="tel"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={wantsDelivery} onChange={(e) => setWantsDelivery(e.target.checked)} />
                    Je veux être livré
                  </label>
                  {wantsDelivery && (
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Adresse de livraison (quartier, repère…)"
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
                    />
                  )}
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Message pour les boutiques (facultatif)"
                    rows={2}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
              )}
            </div>

            {groups.length > 0 && (
              <div className="border-t border-zinc-200 px-4 py-3">
                <div className="mb-2 flex justify-between text-sm">
                  <span>Total ({groups.length} boutique{groups.length > 1 ? "s" : ""})</span>
                  <strong>{formatMoney(grandTotal, currency)}</strong>
                </div>
                <button
                  type="button"
                  onClick={checkout}
                  disabled={pending}
                  className="w-full rounded-xl bg-zindo-green-500 py-3 text-sm font-bold text-white hover:bg-zindo-green-600 disabled:opacity-60"
                >
                  {pending ? "Envoi en cours…" : "Envoyer ma commande"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

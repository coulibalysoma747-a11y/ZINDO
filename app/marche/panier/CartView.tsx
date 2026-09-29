"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Package, Plus, ShoppingCart, Store, Trash2, Truck } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { getCartDetailsAction, placeMarketOrdersAction, type CartShop } from "@/lib/actions/market-orders";
import { setCartQuantity, useCart, writeCart } from "@/components/market/cart-store";

type Buyer = { name: string; phone: string; city: string | null; address: string | null } | null;
type Choice = { deliveryMode: "LIVRAISON" | "RETRAIT"; paymentMethod: "A_LA_LIVRAISON" | "AU_RETRAIT" | "MOBILE_MONEY"; mobileMoneyOperator?: "ORANGE" | "MOOV"; mobileMoneyReference?: string };

function defaultChoice(shop: CartShop): Choice {
  const deliveryMode = shop.pickupEnabled || !shop.deliveryEnabled ? "RETRAIT" : "LIVRAISON";
  return { deliveryMode, paymentMethod: paymentOptions(shop, deliveryMode)[0]?.key ?? "MOBILE_MONEY" };
}

function paymentOptions(shop: CartShop, mode: Choice["deliveryMode"]) {
  const options: { key: Choice["paymentMethod"]; label: string }[] = [];
  if (mode === "LIVRAISON" && shop.payOnDelivery) options.push({ key: "A_LA_LIVRAISON", label: "Paiement à la livraison" });
  if (mode === "RETRAIT" && shop.payOnPickup) options.push({ key: "AU_RETRAIT", label: "Paiement au retrait" });
  if (shop.mobileMoneyEnabled) options.push({ key: "MOBILE_MONEY", label: "Mobile Money" });
  return options;
}

export function CartView({ buyer }: { buyer: Buyer }) {
  const router = useRouter();
  const lines = useCart();
  const [shops, setShops] = useState<CartShop[] | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [form, setForm] = useState({ customerName: buyer?.name ?? "", customerPhone: buyer?.phone ?? "", address: buyer?.address ?? "", city: buyer?.city ?? "", note: "" });
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const linesKey = JSON.stringify(lines);

  useEffect(() => {
    let cancelled = false;
    getCartDetailsAction(JSON.parse(linesKey)).then((result) => {
      if (cancelled) return;
      setShops(result);
      setChoices((prev) => Object.fromEntries(result.map((s) => [s.shopId, prev[s.shopId] ?? defaultChoice(s)])));
    });
    return () => {
      cancelled = true;
    };
  }, [linesKey]);

  const totals = useMemo(() => {
    const perShop = (shops ?? []).map((s) => {
      const subtotal = s.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const delivery = choices[s.shopId]?.deliveryMode === "LIVRAISON" ? s.deliveryFee : 0;
      return { shopId: s.shopId, subtotal, delivery, currency: s.currency };
    });
    return {
      perShop,
      subtotal: perShop.reduce((sum, s) => sum + s.subtotal, 0),
      delivery: perShop.reduce((sum, s) => sum + s.delivery, 0),
    };
  }, [shops, choices]);

  const needsAddress = Object.values(choices).some((c) => c.deliveryMode === "LIVRAISON");

  function setChoice(shopId: string, patch: Partial<Choice>) {
    setChoices((prev) => ({ ...prev, [shopId]: { ...prev[shopId], ...patch } }));
  }

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await placeMarketOrdersAction({
        ...form,
        address: form.address || undefined,
        city: form.city || undefined,
        note: form.note || undefined,
        lines,
        shops: Object.entries(choices).map(([shopId, c]) => ({ shopId, ...c })),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      writeCart([]);
      router.push(`/marche/commandes?nouvelles=${encodeURIComponent((result.numbers ?? []).join(","))}`);
    });
  }

  if (shops === null) return <p className="py-10 text-center text-sm text-zinc-500">Chargement du panier…</p>;
  if (shops.length === 0) {
    return (
      <div className="space-y-3 py-10 text-center">
        <ShoppingCart className="mx-auto h-10 w-10 text-zinc-300" />
        <p className="font-semibold text-zinc-800">Votre panier est vide</p>
        <Link href="/marche" className="inline-block rounded-xl bg-zindo-green-600 px-5 py-2.5 text-sm font-semibold text-white">
          Découvrir le Marché
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-zinc-900">Mon panier</h1>
        {shops.map((shop) => {
          const choice = choices[shop.shopId] ?? defaultChoice(shop);
          const payments = paymentOptions(shop, choice.deliveryMode);
          return (
            <section key={shop.shopId} className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
              <Link href={`/marche/boutique/${shop.slug}`} className="text-sm font-bold text-zinc-900 hover:underline">
                <Store className="mr-1.5 inline h-4 w-4 text-zinc-500" />
                {shop.name}
              </Link>
              {shop.items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100"><Package className="h-6 w-6 text-zinc-400" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-900">{item.name}</p>
                    <p className="text-sm font-bold text-zindo-green-700">{formatMoney(item.unitPrice, shop.currency)}</p>
                    {item.quantity > item.available && (
                      <p className="text-xs text-red-600">{item.available > 0 ? `Il n'en reste que ${item.available}` : "Rupture de stock"}</p>
                    )}
                  </div>
                  <div className="flex items-center rounded-lg border border-zinc-300">
                    <button type="button" aria-label="Moins" onClick={() => setCartQuantity(item.productId, item.quantity - 1)} className="flex h-8 w-8 items-center justify-center">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Plus"
                      disabled={item.quantity >= item.available}
                      onClick={() => setCartQuantity(item.productId, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center disabled:opacity-30"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button type="button" aria-label="Retirer" onClick={() => setCartQuantity(item.productId, 0)} className="p-1 text-zinc-400 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {buyer && (
                <div className="space-y-2 border-t border-zinc-100 pt-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {shop.deliveryEnabled && (
                      <ChoiceButton active={choice.deliveryMode === "LIVRAISON"} onClick={() => setChoice(shop.shopId, { deliveryMode: "LIVRAISON", paymentMethod: paymentOptions(shop, "LIVRAISON")[0]?.key })}>
                        <Truck className="mr-1.5 inline h-4 w-4" />
                        Livraison {shop.deliveryFee > 0 ? `(${formatMoney(shop.deliveryFee, shop.currency)})` : "(gratuite)"}
                      </ChoiceButton>
                    )}
                    {shop.pickupEnabled && (
                      <ChoiceButton active={choice.deliveryMode === "RETRAIT"} onClick={() => setChoice(shop.shopId, { deliveryMode: "RETRAIT", paymentMethod: paymentOptions(shop, "RETRAIT")[0]?.key })}>
                        <Store className="mr-1.5 inline h-4 w-4" />
                        Retrait en boutique
                      </ChoiceButton>
                    )}
                  </div>
                  {choice.deliveryMode === "RETRAIT" && (shop.address || shop.city) && (
                    <p className="text-xs text-zinc-500">Retrait : {[shop.address, shop.city].filter(Boolean).join(", ")}</p>
                  )}
                  {choice.deliveryMode === "LIVRAISON" && shop.deliveryNote && <p className="text-xs text-zinc-500">{shop.deliveryNote}</p>}
                  <div className="flex flex-wrap gap-2">
                    {payments.map((p) => (
                      <ChoiceButton key={p.key} active={choice.paymentMethod === p.key} onClick={() => setChoice(shop.shopId, { paymentMethod: p.key })}>
                        {p.label}
                      </ChoiceButton>
                    ))}
                  </div>
                  {choice.paymentMethod === "MOBILE_MONEY" && (
                    <div className="space-y-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                      <p>
                        Envoyez <strong>{formatMoney(totals.perShop.find((t) => t.shopId === shop.shopId)!.subtotal + (choice.deliveryMode === "LIVRAISON" ? shop.deliveryFee : 0), shop.currency)}</strong> au vendeur, puis indiquez la
                        référence du transfert. Le vendeur confirmera la commande après vérification.
                      </p>
                      {shop.orangeMoneyNumber && <p className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Orange Money : <strong>{shop.orangeMoneyNumber}</strong></p>}
                      {shop.moovMoneyNumber && <p className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-600" /> Moov Money : <strong>{shop.moovMoneyNumber}</strong></p>}
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={choice.mobileMoneyOperator ?? ""}
                          onChange={(e) => setChoice(shop.shopId, { mobileMoneyOperator: (e.target.value || undefined) as Choice["mobileMoneyOperator"] })}
                          className="h-9 rounded-lg border border-amber-300 bg-white px-2"
                        >
                          <option value="">Opérateur…</option>
                          {shop.orangeMoneyNumber && <option value="ORANGE">Orange Money</option>}
                          {shop.moovMoneyNumber && <option value="MOOV">Moov Money</option>}
                        </select>
                        <input
                          value={choice.mobileMoneyReference ?? ""}
                          onChange={(e) => setChoice(shop.shopId, { mobileMoneyReference: e.target.value })}
                          placeholder="Référence du transfert"
                          className="h-9 min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-2"
                        />
                      </div>
                    </div>
                  )}
                  {payments.length === 0 && <p className="text-xs text-red-600">Aucun moyen de paiement proposé pour ce mode : choisissez l&apos;autre.</p>}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <aside className="h-fit space-y-4 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 lg:sticky lg:top-20">
        <div className="space-y-1 text-sm">
          {/* Un total par monnaie : les boutiques peuvent être dans des pays différents. */}
          {[...new Set(totals.perShop.map((t) => t.currency))].map((currency) => {
            const rows = totals.perShop.filter((t) => t.currency === currency);
            const subtotal = rows.reduce((sum, t) => sum + t.subtotal, 0);
            const delivery = rows.reduce((sum, t) => sum + t.delivery, 0);
            return (
              <div key={currency} className="space-y-1">
                <Row label="Sous-total" value={formatMoney(subtotal, currency)} />
                <Row label="Livraison" value={formatMoney(delivery, currency)} />
                <div className="flex justify-between border-t border-zinc-100 pt-2 text-base font-bold">
                  <span>Total</span>
                  <span className="text-zindo-green-700">{formatMoney(subtotal + delivery, currency)}</span>
                </div>
              </div>
            );
          })}
          {shops.length > 1 && <p className="text-xs text-zinc-500">Une commande sera créée pour chacune des {shops.length} boutiques.</p>}
        </div>

        {!buyer ? (
          <div className="space-y-3 rounded-xl bg-zindo-green-50 p-4 text-center">
            <p className="text-sm font-semibold text-zinc-900">Créez gratuitement votre compte ZINDO pour continuer.</p>
            <Link href="/marche/compte?mode=inscription&suite=/marche/panier" className="block rounded-xl bg-zindo-green-600 py-2.5 text-sm font-semibold text-white">
              Créer un compte
            </Link>
            <Link href="/marche/compte?suite=/marche/panier" className="block rounded-xl border border-zinc-300 bg-white py-2.5 text-sm font-semibold text-zinc-800">
              Se connecter
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <Input label="Nom" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
            <Input label="Téléphone" value={form.customerPhone} onChange={(v) => setForm({ ...form, customerPhone: v })} inputMode="tel" />
            {needsAddress && (
              <>
                <Input label="Adresse de livraison (quartier, repère)" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                <Input label="Ville" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              </>
            )}
            <Input label="Message au vendeur (facultatif)" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              disabled={pending}
              onClick={submit}
              className="h-12 w-full rounded-xl bg-zindo-green-600 font-semibold text-white hover:bg-zindo-green-700 disabled:opacity-50"
            >
              {pending ? "Envoi…" : "Confirmer la commande"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "rounded-xl border-2 border-zindo-green-600 bg-zindo-green-50 px-3 py-1.5 font-semibold text-zindo-green-800" : "rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700"}
    >
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-zinc-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Input({ label, value, onChange, inputMode }: { label: string; value: string; onChange: (v: string) => void; inputMode?: "tel" }) {
  return (
    <label className="block text-xs font-medium text-zinc-600">
      {label}
      <input value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900" />
    </label>
  );
}

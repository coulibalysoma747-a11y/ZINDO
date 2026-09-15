"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Plus, Minus, ArrowLeft, Search } from "lucide-react";
import { ProductGrid, type PosProduct } from "@/components/products/ProductGrid";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { formatMoney } from "@/lib/format";
import { createQuoteAction } from "@/lib/actions/quotes";

type CartLine = {
  product: PosProduct;
  quantity: number;
  unitPrice: number;
  discount: number;
};

export function DevisForm({
  locationId,
  currency,
  customers,
  posProducts,
}: {
  locationId: string;
  currency: string;
  customers: { id: string; name: string; phone: string | null }[];
  posProducts: PosProduct[];
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posProducts;
    return posProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q)
    );
  }, [posProducts, search]);

  const subtotal = useMemo(
    () => cart.reduce((s, line) => s + line.unitPrice * line.quantity - line.discount, 0),
    [cart]
  );
  const total = Math.max(0, subtotal - discount);

  function addProduct(product: PosProduct) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { product, quantity: 1, unitPrice: product.salePrice, discount: 0 }];
    });
  }

  function updateLine(productId: string, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.product.id === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  function handleSubmit() {
    setError(null);
    if (cart.length === 0) {
      setError("Ajoutez au moins un article au devis");
      return;
    }
    startTransition(async () => {
      const result = await createQuoteAction({
        locationId,
        items: cart.map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          unit: l.product.unit,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
        })),
        customerId: customerId || undefined,
        discount,
        validUntil: validUntil || undefined,
        note: note || undefined,
      });
      if (result.error || !result.quoteId) {
        setError(result.error ?? "Impossible d'enregistrer le devis");
        return;
      }
      router.push(`/devis/${result.quoteId}`);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div>
          <Link href="/devis" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="h-4 w-4" /> Retour aux devis
          </Link>
          <h1 className="mt-2 text-xl font-bold text-zinc-900">Nouveau devis</h1>
          <p className="text-sm text-zinc-500">Sans impact sur le stock tant que le devis n&apos;est pas converti en vente.</p>
        </div>

        {posProducts.length > 0 && (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ajouter un produit par nom, référence ou code-barres..."
                className="pl-9"
              />
            </div>
            <div className="max-h-[320px] overflow-y-auto rounded-xl">
              <ProductGrid products={filteredProducts} onSelect={addProduct} currency={currency} />
            </div>
          </>
        )}

        <Card>
          <CardBody className="p-0">
            {cart.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">Aucun article dans ce devis.</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-left text-zinc-500">
                      <tr>
                        <th className="px-4 py-2 font-medium">Produit</th>
                        <th className="px-4 py-2 font-medium">Qté</th>
                        <th className="px-4 py-2 text-right font-medium">P.U.</th>
                        <th className="px-4 py-2 text-right font-medium">Remise</th>
                        <th className="px-4 py-2 text-right font-medium">Total</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {cart.map((line) => (
                        <tr key={line.product.id}>
                          <td className="px-4 py-2">
                            <p className="font-medium text-zinc-900">{line.product.name}</p>
                            <p className="text-xs text-zinc-400">{line.product.reference}</p>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateLine(line.product.id, { quantity: Math.max(1, line.quantity - 1) })}
                                className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={line.quantity}
                                onChange={(e) => updateLine(line.product.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                                className="h-7 w-14 rounded border border-zinc-200 text-center text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => updateLine(line.product.id, { quantity: line.quantity + 1 })}
                                className="rounded p-1 text-zinc-500 hover:bg-zinc-100"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              value={line.unitPrice}
                              onChange={(e) => updateLine(line.product.id, { unitPrice: Number(e.target.value) || 0 })}
                              className="h-7 w-24 rounded border border-zinc-200 text-right text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              value={line.discount}
                              onChange={(e) => updateLine(line.product.id, { discount: Number(e.target.value) || 0 })}
                              className="h-7 w-20 rounded border border-zinc-200 text-right text-sm"
                            />
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-zinc-900">
                            {formatMoney(line.unitPrice * line.quantity - line.discount, currency)}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => removeLine(line.product.id)}
                              className="rounded p-1 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="divide-y divide-zinc-100 sm:hidden">
                  {cart.map((line) => (
                    <li key={line.product.id} className="space-y-2.5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-900">{line.product.name}</p>
                          <p className="text-xs text-zinc-400">{line.product.reference}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(line.product.id)}
                          className="shrink-0 rounded p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateLine(line.product.id, { quantity: Math.max(1, line.quantity - 1) })}
                          className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => updateLine(line.product.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                          className="h-9 w-16 rounded-lg border border-zinc-200 text-center text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => updateLine(line.product.id, { quantity: line.quantity + 1 })}
                          className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <span className="ml-auto text-right font-semibold text-zinc-900">
                          {formatMoney(line.unitPrice * line.quantity - line.discount, currency)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-xs text-zinc-500">P.U.</span>
                          <input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(line.product.id, { unitPrice: Number(e.target.value) || 0 })}
                            className="h-9 w-full rounded-lg border border-zinc-200 px-2 text-right text-sm"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-zinc-500">Remise</span>
                          <input
                            type="number"
                            min={0}
                            inputMode="decimal"
                            value={line.discount}
                            onChange={(e) => updateLine(line.product.id, { discount: Number(e.target.value) || 0 })}
                            className="h-9 w-full rounded-lg border border-zinc-200 px-2 text-right text-sm"
                          />
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Client</h2>
          </CardHeader>
          <CardBody>
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Client de passage</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </Select>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Détails du devis</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <Field label="Remise globale" htmlFor="discount">
              <Input id="discount" type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
            </Field>
            <Field label="Valable jusqu'au (facultatif)" htmlFor="validUntil">
              <Input id="validUntil" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </Field>
            <Field label="Note (facultatif)" htmlFor="note">
              <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>

            <div className="space-y-1 border-t border-zinc-100 pt-3 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Sous-total</span>
                <span>{formatMoney(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-zinc-900">
                <span>Total</span>
                <span>{formatMoney(total, currency)}</span>
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <Button className="w-full" size="lg" disabled={pending} onClick={handleSubmit}>
              {pending ? "Enregistrement..." : "Enregistrer le devis"}
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2, Plus, Minus, UserPlus, Search, Loader2, Wallet, Lock } from "lucide-react";
import { ProductGrid, type PosProduct } from "@/components/products/ProductGrid";
import { BarcodeScannerButton } from "@/components/products/BarcodeScannerButton";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { formatMoney, formatDateTime } from "@/lib/format";
import { createSaleAction } from "@/lib/actions/sales";
import { getSaleDocumentAction, type SaleDocument } from "@/lib/actions/receipt";
import { getPosProductsAction, findProductByExactCodeAction } from "@/lib/actions/product-search";
import { ClientFormModal } from "@/app/(app)/clients/ClientFormModal";
import { PosSettingsButton } from "./PosSettingsButton";
import { PrinterSettingsButton } from "./PrinterSettingsButton";
import { ReceiptPrintPanel } from "./ReceiptPrintPanel";
import type { PaymentMethod } from "@/lib/db-types";

type CartLine = {
  product: PosProduct;
  quantity: number;
  unitPrice: number;
  discount: number;
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
};

type SessionInfo = {
  id: string;
  number: string;
  openedAt: string;
  cashierName: string;
};

export function POS({
  mode = "pos",
  customers,
  paymentMethods,
  currency,
  locationId,
  locationName,
  canEditProducts = false,
  autoPrintReceipt: initialAutoPrint,
  printerTicketWidth: initialPrinterWidth,
  session,
}: {
  mode?: "pos" | "facture";
  customers: { id: string; name: string; phone: string | null }[];
  paymentMethods: { method: PaymentMethod; label: string }[];
  currency: string;
  locationId: string;
  locationName: string;
  canEditProducts?: boolean;
  autoPrintReceipt: boolean;
  printerTicketWidth: string | null;
  session: SessionInfo;
}) {
  const isFacture = mode === "facture";
  const [cart, setCart] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState("");
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(initialAutoPrint);
  const [printerTicketWidth, setPrinterTicketWidth] = useState(initialPrinterWidth);

  useEffect(() => {
    setCart([]);
    setLoadingProducts(true);
    getPosProductsAction(locationId).then((result) => {
      setProducts(result);
      setLoadingProducts(false);
    });
  }, [locationId]);

  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    paymentMethods[0]?.method ?? "ESPECES"
  );
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [receiptDoc, setReceiptDoc] = useState<Extract<SaleDocument, { success: true }> | null>(null);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const subtotal = useMemo(
    () => cart.reduce((s, line) => s + line.unitPrice * line.quantity - line.discount, 0),
    [cart]
  );
  const total = Math.max(0, subtotal - discount);
  const isCreditOnly = paymentMethod === "CREDIT";
  const amountPaid = isCreditOnly
    ? amountPaidInput === ""
      ? 0
      : Number(amountPaidInput)
    : amountPaidInput === ""
      ? total
      : Number(amountPaidInput);
  const change = Math.max(0, amountPaid - total);
  const remaining = Math.max(0, total - amountPaid);

  function addProduct(product: PosProduct) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: Math.min(l.quantity + 1, product.quantity) } : l
        );
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

  async function handleScan(code: string) {
    const product = await findProductByExactCodeAction(code, locationId);
    if (product) addProduct(product);
    else setError(`Aucun produit trouvé pour le code "${code}"`);
  }

  function handleSubmit() {
    setError(null);
    if (cart.length === 0) {
      setError("Ajoutez au moins un produit au panier");
      return;
    }
    if (remaining > 0 && !customerId) {
      setError("Sélectionnez un client pour une vente à crédit ou un paiement partiel");
      return;
    }
    startTransition(async () => {
      const result = await createSaleAction({
        locationId,
        items: cart.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
        })),
        customerId: customerId || undefined,
        discount,
        paymentMethod,
        amountPaid,
        documentType: isFacture ? "FACTURE" : "TICKET",
      });
      if (!result.success) {
        setError(result.error);
        return;
      }

      // On ne quitte jamais la page Vente après un encaissement : la caissière
      // doit pouvoir enchaîner immédiatement sur le client suivant. Le
      // ticket/la facture s'affiche dans un panneau (impression auto si activée
      // dans les réglages) plutôt que sur une page séparée.
      setCart([]);
      setCustomerId("");
      setDiscount(0);
      setAmountPaidInput("");

      const doc = await getSaleDocumentAction(result.saleId);
      if (doc.success) setReceiptDoc(doc);
      else setError("Vente enregistrée, mais impossible de charger le ticket pour l'impression.");

      getPosProductsAction(locationId).then(setProducts);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <div>
              <h1 className="text-xl font-bold text-zinc-900">{isFacture ? "Facture A4" : "Vente / Caisse"}</h1>
              <p className="text-sm text-zinc-500">
                Boutique : <span className="font-medium text-zinc-700">{locationName}</span> —{" "}
                {isFacture
                  ? "constituez la facture détaillée du client, produit par produit."
                  : "touchez un produit pour l'ajouter au panier."}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5 pt-0.5">
              <PosSettingsButton
                autoPrintReceipt={autoPrintReceipt}
                printerTicketWidth={printerTicketWidth}
                onAutoPrintChange={setAutoPrintReceipt}
              />
              <PrinterSettingsButton
                autoPrintReceipt={autoPrintReceipt}
                printerTicketWidth={printerTicketWidth}
                onPrinterWidthChange={setPrinterTicketWidth}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <Wallet className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Session {session.number} ouverte</p>
              <p className="text-emerald-700">
                {session.cashierName} — depuis {formatDateTime(session.openedAt)}
              </p>
            </div>
            <Link
              href={`/ventes/session/${session.id}/fermer`}
              className="ml-2 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 font-medium text-white hover:bg-emerald-700"
            >
              <Lock className="h-3.5 w-3.5" /> Fermer la caisse
            </Link>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit par nom, référence ou code-barres..."
              className="pl-9"
              autoFocus
            />
          </div>
          <BarcodeScannerButton onDetected={handleScan} />
        </div>

        <div className="max-h-[420px] overflow-y-auto rounded-xl">
          {loadingProducts ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement des produits...
            </div>
          ) : (
            <ProductGrid
              products={filteredProducts}
              onSelect={addProduct}
              currency={currency}
              canEditProducts={canEditProducts}
            />
          )}
        </div>

        <Card>
          <CardBody className="p-0">
            {cart.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">Le panier est vide.</p>
            ) : (
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
                            max={line.product.quantity}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line.product.id, {
                                quantity: Math.min(
                                  line.product.quantity,
                                  Math.max(1, Number(e.target.value) || 1)
                                ),
                              })
                            }
                            className="h-7 w-14 rounded border border-zinc-200 text-center text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateLine(line.product.id, {
                                quantity: Math.min(line.product.quantity, line.quantity + 1),
                              })
                            }
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
            )}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Client</h2>
          </CardHeader>
          <CardBody className="flex gap-2">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="flex-1">
              <option value="">Client de passage</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </Select>
            <Button type="button" variant="outline" onClick={() => setNewClientOpen(true)}>
              <UserPlus className="h-4 w-4" />
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Paiement</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <Field label="Remise globale" htmlFor="discount">
              <Input
                id="discount"
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Moyen de paiement" htmlFor="paymentMethod">
              <Select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                {paymentMethods.map((m) => (
                  <option key={m.method} value={m.method}>
                    {m.label || PAYMENT_LABELS[m.method]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Montant reçu"
              htmlFor="amountPaid"
              hint={isCreditOnly ? "Laissez à 0 pour un crédit total" : "Laissez vide pour un paiement exact"}
            >
              <Input
                id="amountPaid"
                type="number"
                min={0}
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                placeholder={String(total)}
              />
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
              {change > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Monnaie à rendre</span>
                  <span>{formatMoney(change, currency)}</span>
                </div>
              )}
              {remaining > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Reste à payer (crédit)</span>
                  <span>{formatMoney(remaining, currency)}</span>
                </div>
              )}
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <Button className="w-full" size="lg" disabled={pending} onClick={handleSubmit}>
              {pending ? "Enregistrement..." : isFacture ? "Générer la facture" : "Valider la vente"}
            </Button>
          </CardBody>
        </Card>
      </div>

      <ClientFormModal open={newClientOpen} onClose={() => setNewClientOpen(false)} />

      {receiptDoc && (
        <ReceiptPrintPanel doc={receiptDoc} autoPrint={autoPrintReceipt} onClose={() => setReceiptDoc(null)} />
      )}
    </div>
  );
}

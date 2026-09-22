"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { adminUpdateSaleAction, adminCancelSaleAction } from "@/lib/actions/admin-sales";

type PaymentMethodValue = "ESPECES" | "MOBILE_MONEY" | "CARTE" | "CREDIT" | "AUTRE";

const PAYMENT_METHODS: Array<{ value: PaymentMethodValue; label: string }> = [
  { value: "ESPECES", label: "Espèces" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "CARTE", label: "Carte bancaire" },
  { value: "CREDIT", label: "Crédit" },
  { value: "AUTRE", label: "Autre" },
];

type Item = {
  productId: string;
  name: string;
  reference: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  multiplier: number;
  packagingUnitId: string | null;
  unitLabel: string | null;
  availableStock: number;
};

type Customer = { id: string; name: string; phone: string | null };

export function AdminSaleCorrectionForm({
  businessId,
  saleId,
  saleNumber,
  currency,
  customers,
  initialCustomerId,
  initialDiscount,
  initialPaymentMethod,
  initialAmountPaid,
  initialNote,
  initialItems,
}: {
  businessId: string;
  saleId: string;
  saleNumber: string;
  currency: string;
  customers: Customer[];
  initialCustomerId: string;
  initialDiscount: number;
  initialPaymentMethod: PaymentMethodValue | "MIXTE";
  initialAmountPaid: number;
  initialNote: string;
  initialItems: Item[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initialItems);
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [discount, setDiscount] = useState(initialDiscount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>(
    initialPaymentMethod === "MIXTE" ? "ESPECES" : initialPaymentMethod
  );
  const [amountPaid, setAmountPaid] = useState(initialAmountPaid);
  const [note, setNote] = useState(initialNote);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  function updateItem(productId: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.productId === productId ? { ...it, ...patch } : it)));
  }
  function removeItem(productId: string) {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity - i.discount, 0);
  const total = Math.max(0, subtotal - discount);

  function handleSubmit() {
    setError(undefined);
    setSuccess(undefined);
    if (items.length === 0) {
      setError('Le panier ne peut pas être vide — utilisez plutôt "Annuler la vente".');
      return;
    }
    startTransition(async () => {
      const result = await adminUpdateSaleAction(businessId, saleId, {
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          multiplier: i.multiplier,
          packagingUnitId: i.packagingUnitId,
          unitLabel: i.unitLabel,
        })),
        discount,
        paymentMethod,
        amountPaid,
        customerId: customerId || null,
        note: note || undefined,
      });
      if (result.error) setError(result.error);
      else {
        setSuccess(result.success ?? "Vente corrigée");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Articles</h2>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Produit</th>
                <th className="px-4 py-2 font-medium">Qté</th>
                <th className="px-4 py-2 font-medium">Prix unitaire</th>
                <th className="px-4 py-2 font-medium">Remise</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((item) => (
                <tr key={item.productId}>
                  <td className="px-4 py-2">
                    <p className="font-medium text-zinc-900">{item.name}</p>
                    <p className="text-xs text-zinc-400">
                      {item.reference}
                      {item.unitLabel ? ` — ${item.unitLabel}` : ""} — stock dispo : {Math.floor(item.availableStock / item.multiplier)}
                    </p>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.productId, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="h-8 w-16 rounded border border-zinc-200 px-2 text-sm outline-none focus:border-zindo-green-500"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.productId, { unitPrice: Number(e.target.value) || 0 })}
                      className="h-8 w-24 rounded border border-zinc-200 px-2 text-sm outline-none focus:border-zindo-green-500"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={0}
                      value={item.discount}
                      onChange={(e) => updateItem(item.productId, { discount: Number(e.target.value) || 0 })}
                      className="h-8 w-20 rounded border border-zinc-200 px-2 text-sm outline-none focus:border-zindo-green-500"
                    />
                  </td>
                  <td className="px-4 py-2 font-medium text-zinc-900">
                    {formatMoney(item.unitPrice * item.quantity - item.discount, currency)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="rounded p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <p className="px-4 py-4 text-sm text-zinc-400">
              Plus aucun article — utilisez &quot;Annuler la vente&quot; plutôt que d&apos;enregistrer un panier vide.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Paiement</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Client" htmlFor="customerId">
            <Select id="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Aucun client</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` — ${c.phone}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Moyen de paiement" htmlFor="paymentMethod">
            <Select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodValue)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Remise globale" htmlFor="discount">
            <Input
              id="discount"
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Montant payé" htmlFor="amountPaid">
            <Input
              id="amountPaid"
              type="number"
              min={0}
              value={amountPaid}
              onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Note (facultatif)" htmlFor="note" hint="Utile pour garder une trace de la raison de cette correction.">
              <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4">
        <div className="text-sm text-zinc-600">
          <p>
            Sous-total : {formatMoney(subtotal, currency)} — Remise : {formatMoney(discount, currency)}
          </p>
          <p className="text-lg font-bold text-zinc-900">Total : {formatMoney(total, currency)}</p>
        </div>
        <div className="flex items-center gap-2">
          <ConfirmButton
            label={
              <span className="inline-flex items-center rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                Annuler la vente
              </span>
            }
            confirmTitle={`Annuler la vente ${saleNumber}`}
            confirmMessage="Le stock sera réintégré et la vente marquée comme annulée. Cette action reste tracée dans le journal admin."
            action={() => adminCancelSaleAction(businessId, saleId)}
            onDone={() => router.refresh()}
          />
          <Button type="button" disabled={pending} onClick={handleSubmit}>
            {pending ? "Enregistrement..." : "Enregistrer les corrections"}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}
    </div>
  );
}

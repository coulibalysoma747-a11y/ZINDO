"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/format";
import { closeTableOrderAction, cancelTableOrderAction } from "@/lib/actions/tables";

const PAYMENT_LABELS: Record<string, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
};

export function TableOrderCloseBar({
  tableId,
  total,
  customers,
  defaultCustomerId,
  paymentMethods,
  currency,
}: {
  tableId: string;
  total: number;
  customers: { id: string; name: string }[];
  defaultCustomerId: string;
  paymentMethods: { method: string; label: string }[];
  currency: string;
}) {
  const router = useRouter();
  const [closeOpen, setCloseOpen] = useState(false);
  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]?.method ?? "ESPECES");
  const [amountPaid, setAmountPaid] = useState(total);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const netTotal = Math.max(0, total - discount);

  function handleClose() {
    const formData = new FormData();
    if (customerId) formData.set("customerId", customerId);
    formData.set("discount", String(discount));
    formData.set("paymentMethod", paymentMethod);
    formData.set("amountPaid", String(amountPaid));
    setError(null);
    startTransition(async () => {
      const result = await closeTableOrderAction(tableId, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push("/tables");
    });
  }

  function handleCancel() {
    if (!confirm("Annuler ce compte ? Les articles commandés seront perdus.")) return;
    startTransition(async () => {
      const result = await cancelTableOrderAction(tableId);
      if (result?.error) alert(result.error);
      else router.push("/tables");
    });
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center gap-2 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur print:hidden">
      <Button variant="ghost" disabled={pending} onClick={handleCancel}>
        Annuler le compte
      </Button>
      <Button disabled={pending} onClick={() => setCloseOpen(true)}>
        Encaisser {formatMoney(total, currency)}
      </Button>

      <Modal open={closeOpen} onClose={() => setCloseOpen(false)} title="Encaisser le compte">
        <div className="space-y-4">
          <Field label="Client (facultatif — requis si crédit ou paiement partiel)" htmlFor="customerId">
            <Select id="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Sans client</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Remise" htmlFor="discount">
              <Input id="discount" type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} />
            </Field>
            <Field label="Moyen de paiement" htmlFor="paymentMethod">
              <Select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {paymentMethods.map((m) => (
                  <option key={m.method} value={m.method}>
                    {PAYMENT_LABELS[m.method] ?? m.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Montant reçu" htmlFor="amountPaid">
            <Input id="amountPaid" type="number" min={0} value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value) || 0)} />
          </Field>

          <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
            <span className="text-zinc-500">Total à payer</span>
            <span className="font-semibold text-zinc-900">{formatMoney(netTotal, currency)}</span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCloseOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleClose} disabled={pending}>
              {pending ? "Encaissement..." : "Valider l'encaissement"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

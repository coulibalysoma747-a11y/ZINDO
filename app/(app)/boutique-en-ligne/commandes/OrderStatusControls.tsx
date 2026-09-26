"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/format";
import { updateOnlineOrderStatusAction, encashOnlineOrderAction } from "@/lib/actions/online-store";
import type { OnlineOrderStatus } from "@/lib/db-types";

const STATUS_OPTIONS: { value: OnlineOrderStatus; label: string }[] = [
  { value: "EN_ATTENTE", label: "À traiter" },
  { value: "CONFIRMEE", label: "Confirmée" },
  { value: "PRETE", label: "Prête" },
  { value: "LIVREE", label: "Encaissée" },
  { value: "ANNULEE", label: "Annulée" },
];

const PAYMENT_OPTIONS = [
  { value: "ESPECES", label: "Espèces" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "CARTE", label: "Carte bancaire" },
  { value: "AUTRE", label: "Autre" },
];

export function OrderStatusControls({
  orderId,
  status,
  encashEnabled = false,
  amountDue = 0,
  deliveryFee = 0,
  currency = "XOF",
}: {
  orderId: string;
  status: OnlineOrderStatus;
  encashEnabled?: boolean;
  amountDue?: number;
  deliveryFee?: number;
  currency?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [encashOpen, setEncashOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("ESPECES");
  const [operator, setOperator] = useState("ORANGE");
  const router = useRouter();

  const canEncash = encashEnabled && status !== "LIVREE" && status !== "ANNULEE";
  // Avec l'encaissement réel, « Encaissée » ne se choisit plus dans la liste.
  const options = encashEnabled && status !== "LIVREE" ? STATUS_OPTIONS.filter((o) => o.value !== "LIVREE") : STATUS_OPTIONS;

  function handleEncash() {
    setError(null);
    const formData = new FormData();
    formData.set("paymentMethod", paymentMethod);
    if (paymentMethod === "MOBILE_MONEY") formData.set("mobileMoneyOperator", operator);
    startTransition(async () => {
      const result = await encashOnlineOrderAction(orderId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEncashOpen(false);
      if (result.saleId) router.push(`/ventes/${result.saleId}`);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {canEncash && (
          <Button type="button" size="sm" onClick={() => setEncashOpen(true)} disabled={pending}>
            <Wallet className="h-3.5 w-3.5" /> Encaisser
          </Button>
        )}
        <Select
          value={status}
          disabled={pending}
          className="h-8 w-auto py-0 text-xs"
          onChange={(e) =>
            startTransition(async () => {
              setError(null);
              const result = await updateOnlineOrderStatusAction(orderId, e.target.value as OnlineOrderStatus);
              if (result?.error) setError(result.error);
              router.refresh();
            })
          }
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
      {error && !encashOpen && <p className="max-w-xs text-right text-xs text-red-600">{error}</p>}

      <Modal open={encashOpen} onClose={() => setEncashOpen(false)} title="Encaisser la commande">
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Une vente est enregistrée avec les articles de la commande : le stock baisse et l&apos;argent entre en caisse.
          </p>
          <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm">
            <span className="text-zinc-500">Montant encaissé</span>
            <span className="font-semibold text-zinc-900">{formatMoney(amountDue, currency)}</span>
          </div>
          {deliveryFee > 0 && (
            <p className="text-xs text-zinc-500">
              Les frais de livraison ({formatMoney(deliveryFee, currency)}) ne sont pas comptés dans la vente.
            </p>
          )}
          <Field label="Moyen de paiement" htmlFor={`paymentMethod-${orderId}`}>
            <Select id={`paymentMethod-${orderId}`} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          {paymentMethod === "MOBILE_MONEY" && (
            <Field label="Opérateur" htmlFor={`operator-${orderId}`}>
              <Select id={`operator-${orderId}`} value={operator} onChange={(e) => setOperator(e.target.value)}>
                <option value="ORANGE">Orange Money</option>
                <option value="MOOV">Moov Money</option>
                <option value="WAVE">Wave</option>
              </Select>
            </Field>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEncashOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEncash} disabled={pending}>
              {pending ? "Encaissement..." : "Valider l'encaissement"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

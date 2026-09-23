"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Trash2 } from "lucide-react";
import type { FactureData } from "@/components/sales/Facture";
import { InvoiceDocument } from "@/components/sales/InvoiceDocument";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatMoney } from "@/lib/format";
import { printDocument } from "@/lib/print";
import { updateQuoteStatusAction, deleteQuoteAction, convertQuoteToSaleAction } from "@/lib/actions/quotes";
import type { PaymentMethod } from "@/lib/db-types";

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  EXPIRE: "Expiré",
  CONVERTI: "Converti en vente",
};

const STATUS_TONE = {
  BROUILLON: "zinc",
  ENVOYE: "blue",
  ACCEPTE: "emerald",
  REFUSE: "red",
  EXPIRE: "amber",
  CONVERTI: "emerald",
} as const;

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
  MIXTE: "Mixte",
};

export function DevisView({
  quoteId,
  status,
  canEdit,
  canConvert,
  data,
  paymentMethods,
}: {
  quoteId: string;
  status: string;
  canEdit: boolean;
  canConvert: boolean;
  data: FactureData;
  paymentMethods: { method: PaymentMethod; label: string }[];
}) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [showConvert, setShowConvert] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ESPECES");
  const [amountPaidInput, setAmountPaidInput] = useState(String(data.total));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function setStatus(next: "ENVOYE" | "ACCEPTE" | "REFUSE" | "EXPIRE") {
    setError(null);
    startTransition(async () => {
      const result = await updateQuoteStatusAction(quoteId, next);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCurrentStatus(next);
    });
  }

  function handleDelete() {
    if (!confirm("Supprimer ce devis ?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteQuoteAction(quoteId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/devis");
    });
  }

  function handleConvert() {
    setError(null);
    startTransition(async () => {
      const result = await convertQuoteToSaleAction({
        quoteId,
        paymentMethod,
        amountPaid: Number(amountPaidInput) || 0,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/ventes/${result.saleId}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/devis" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Retour aux devis
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[currentStatus as keyof typeof STATUS_TONE] ?? "zinc"}>
            {STATUS_LABELS[currentStatus] ?? currentStatus}
          </Badge>
          {canEdit && currentStatus === "BROUILLON" && (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus("ENVOYE")}>
              Marquer envoyé
            </Button>
          )}
          {canEdit && (currentStatus === "BROUILLON" || currentStatus === "ENVOYE") && (
            <>
              <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus("ACCEPTE")}>
                Marquer accepté
              </Button>
              <Button variant="outline" size="sm" disabled={pending} onClick={() => setStatus("REFUSE")}>
                Marquer refusé
              </Button>
            </>
          )}
          {canConvert && (
            <Button size="sm" disabled={pending} onClick={() => setShowConvert(true)}>
              Convertir en vente
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => printDocument("A4")}>
            <Printer className="h-3.5 w-3.5" /> Imprimer
          </Button>
          {canEdit && (
            <Button variant="danger" size="sm" disabled={pending} onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">{error}</p>}

      <InvoiceDocument data={data} />

      <Modal open={showConvert} onClose={() => setShowConvert(false)} title="Convertir le devis en vente">
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            Le stock sera déduit et une vente réelle sera créée pour {formatMoney(data.total, data.currency ?? "XOF")}.
          </p>
          <Field label="Moyen de paiement" htmlFor="paymentMethod">
            <Select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              {paymentMethods.map((m) => (
                <option key={m.method} value={m.method}>
                  {m.label || PAYMENT_LABELS[m.method]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Montant reçu" htmlFor="amountPaid" hint="Laissez à 0 pour un crédit total">
            <Input id="amountPaid" type="number" min={0} value={amountPaidInput} onChange={(e) => setAmountPaidInput(e.target.value)} />
          </Field>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" disabled={pending} onClick={handleConvert}>
              {pending ? "Conversion..." : "Confirmer la vente"}
            </Button>
            <Button variant="outline" onClick={() => setShowConvert(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

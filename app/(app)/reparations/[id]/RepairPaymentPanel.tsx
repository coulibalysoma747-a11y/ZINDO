"use client";

import { useState, useTransition } from "react";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import { recordRepairPaymentAction } from "@/lib/actions/repairs";

export function RepairPaymentPanel({
  ticketId,
  amountPaid,
  remaining,
  currency,
}: {
  ticketId: string;
  amountPaid: number;
  remaining: number;
  currency: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await recordRepairPaymentAction(ticketId, formData);
      if (result?.error) setError(result.error);
      else setSuccess(result?.success ?? null);
    });
  }

  return (
    <div className="space-y-3 border-t border-zinc-100 pt-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-500">Déjà réglé</span>
        <span className="font-medium text-zinc-900">{formatMoney(amountPaid, currency)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-500">Reste à payer</span>
        <span className={`font-semibold ${remaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>{formatMoney(remaining, currency)}</span>
      </div>

      {remaining > 0 && (
        <form action={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Montant reçu" htmlFor="amount">
            <Input id="amount" name="amount" type="number" min={1} max={remaining} defaultValue={remaining} required />
          </Field>
          <Field label="Moyen de paiement" htmlFor="method">
            <Select id="method" name="method" defaultValue="ESPECES">
              <option value="ESPECES">Espèces</option>
              <option value="MOBILE_MONEY">Mobile money</option>
              <option value="CARTE">Carte bancaire</option>
              <option value="AUTRE">Autre</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Enregistrement..." : "Enregistrer le paiement"}
            </Button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-emerald-600">{success}</p>}
    </div>
  );
}

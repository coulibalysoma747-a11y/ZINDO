"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { payInvoiceWithSaspayAction } from "@/lib/actions/saspay";

/** Paiement en ligne de la facture d'abonnement (Orange Money, Moov Money, carte) par SasPay. */
export function SaspayPayButton({ invoiceId, amountLabel }: { invoiceId: string; amountLabel: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2 rounded-lg border border-zindo-green-200 bg-zindo-green-50 p-3">
      <p className="text-sm text-zinc-700">
        Payez <span className="font-semibold text-zinc-900">{amountLabel}</span> en ligne : Orange Money, Moov Money ou carte. Votre abonnement s&apos;active tout seul dès que le paiement est confirmé.
      </p>
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await payInvoiceWithSaspayAction(invoiceId);
            if (result.error || !result.url) {
              setError(result.error ?? "Paiement indisponible");
              return;
            }
            window.location.href = result.url;
          })
        }
      >
        {pending ? "Redirection…" : "Payer avec SasPay"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

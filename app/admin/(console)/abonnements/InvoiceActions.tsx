"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { confirmInvoicePaymentAction, cancelInvoiceAction } from "@/lib/actions/subscription-admin";

export function InvoiceActions({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payer, setPayer] = useState({ lastName: "", firstName: "", phone: "" });
  const router = useRouter();

  if (open) {
    return (
      <form
        className="w-full space-y-2 rounded-lg bg-zinc-50 p-3 sm:w-auto"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await confirmInvoicePaymentAction(invoiceId, payer);
            if (result.error) return setError(result.error);
            setOpen(false);
            router.refresh();
          });
        }}
      >
        <p className="text-xs font-medium text-zinc-600">Qui a payé ?</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input placeholder="Nom" value={payer.lastName} onChange={(e) => setPayer({ ...payer, lastName: e.target.value })} required />
          <Input placeholder="Prénom" value={payer.firstName} onChange={(e) => setPayer({ ...payer, firstName: e.target.value })} required />
          <Input placeholder="Numéro" type="tel" value={payer.phone} onChange={(e) => setPayer({ ...payer, phone: e.target.value })} required />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" type="submit" disabled={pending}>
            <Check className="h-3.5 w-3.5" /> Valider le paiement
          </Button>
          <Button size="sm" type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
            Retour
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button size="sm" disabled={pending} onClick={() => setOpen(true)}>
        <Check className="h-3.5 w-3.5" /> Confirmer
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await cancelInvoiceAction(invoiceId);
            router.refresh();
          })
        }
      >
        <X className="h-3.5 w-3.5" /> Annuler
      </Button>
    </div>
  );
}

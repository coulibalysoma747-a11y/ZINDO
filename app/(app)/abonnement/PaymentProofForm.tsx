"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { submitPaymentProofAction, type ActionState } from "@/lib/actions/subscription";

export function PaymentProofForm({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitPaymentProofAction, undefined);

  useEffect(() => {
    if (state?.success) router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <Field label="Référence de la transaction Mobile Money" htmlFor="reference">
        <Input id="reference" name="reference" placeholder="Ex : MP240613.1234.A56789" required />
      </Field>
      <Field label="Note (facultatif)" htmlFor="note">
        <Textarea id="note" name="note" rows={2} placeholder="Précision utile pour l'administrateur" />
      </Field>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Envoi..." : "Envoyer la référence"}
      </Button>
    </form>
  );
}

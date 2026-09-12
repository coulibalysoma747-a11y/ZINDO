"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { recordCustomerPaymentAction, type ActionState } from "@/lib/actions/customers";

export function RecordPaymentButton({ customerId, maxAmount }: { customerId: string; maxAmount: number }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    recordCustomerPaymentAction,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <HandCoins className="h-4 w-4" /> Enregistrer un remboursement
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Enregistrer un remboursement">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="customerId" value={customerId} />
          <Field label="Montant" htmlFor="amount" hint={`Crédit restant : ${maxAmount}`}>
            <Input id="amount" name="amount" type="number" min={1} max={maxAmount} required autoFocus />
          </Field>
          <Field label="Moyen de paiement" htmlFor="method">
            <Select id="method" name="method" defaultValue="ESPECES">
              <option value="ESPECES">Espèces</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="CARTE">Carte bancaire</option>
              <option value="AUTRE">Autre</option>
            </Select>
          </Field>
          <Field label="Note (facultatif)" htmlFor="note">
            <Input id="note" name="note" />
          </Field>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Printer } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button, ButtonLink } from "@/components/ui/Button";
import { recordCustomerPaymentAction, type ActionState } from "@/lib/actions/customers";

export function RecordPaymentButton({
  customerId,
  maxAmount,
  receiptEnabled = false,
}: {
  customerId: string;
  maxAmount: number;
  /** Flag « documents_client_pdf » : proposer le reçu juste après l'encaissement. */
  receiptEnabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    recordCustomerPaymentAction,
    undefined
  );
  // Réponse déjà vue à la dernière ouverture : son reçu ne doit pas réapparaître.
  const [stateAtOpen, setStateAtOpen] = useState<ActionState>(undefined);
  const receiptId = receiptEnabled && state !== stateAtOpen ? (state?.receiptId ?? null) : null;

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      if (!(receiptEnabled && state.receiptId)) setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setStateAtOpen(state);
          setOpen(true);
        }}
      >
        <HandCoins className="h-4 w-4" /> Enregistrer un remboursement
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Enregistrer un remboursement">
        {receiptId ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-700">Remboursement enregistré.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Fermer
              </Button>
              <ButtonLink href={`/clients/${customerId}/recu/${receiptId}?print=1`}>
                <Printer className="h-4 w-4" /> Imprimer le reçu
              </ButtonLink>
            </div>
          </div>
        ) : (
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
        )}
      </Modal>
    </>
  );
}

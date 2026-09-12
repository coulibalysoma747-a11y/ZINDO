"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createExpenseAction, type ActionState } from "@/lib/actions/expenses";

export function ExpenseFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createExpenseAction, undefined);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle dépense">
      <form action={formAction} className="space-y-4">
        <Field label="Libellé" htmlFor="label">
          <Input id="label" name="label" placeholder="Ex : Facture d'électricité" required autoFocus />
        </Field>
        <Field label="Prix" htmlFor="amount">
          <Input id="amount" name="amount" type="number" min={1} step="1" placeholder="0" required />
        </Field>
        <Field label="Note (facultatif)" htmlFor="note">
          <Textarea id="note" name="note" rows={2} />
        </Field>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

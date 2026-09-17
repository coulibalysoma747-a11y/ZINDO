"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createExpenseAction, type ActionState } from "@/lib/actions/expenses";

const PAYMENT_LABELS: Record<string, string> = { ESPECES: "Espèces", MOBILE_MONEY: "Mobile Money" };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseFormModal({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: string[];
}) {
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant" htmlFor="amount">
            <Input id="amount" name="amount" type="number" min={1} step="1" placeholder="0" required />
          </Field>
          <Field label="Date" htmlFor="date">
            <Input id="date" name="date" type="date" defaultValue={todayIso()} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Catégorie" htmlFor="category">
            <Select id="category" name="category" defaultValue="">
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Règlement" htmlFor="paymentMethod">
            <Select id="paymentMethod" name="paymentMethod" defaultValue="ESPECES">
              {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
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

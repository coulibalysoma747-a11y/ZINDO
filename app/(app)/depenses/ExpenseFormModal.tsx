"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createExpenseAction, updateExpenseAction, type ActionState } from "@/lib/actions/expenses";
import { useKeepValuesOnError } from "@/lib/keep-form-values";

export type EditableExpense = {
  id: string;
  label: string;
  amount: number;
  date: string;
  category: string | null;
  paymentMethod: string;
  note: string | null;
};

const PAYMENT_LABELS: Record<string, string> = { ESPECES: "Espèces", MOBILE_MONEY: "Mobile Money" };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseFormModal({
  open,
  onClose,
  categories,
  expense,
}: {
  open: boolean;
  onClose: () => void;
  categories: string[];
  expense?: EditableExpense | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    expense ? updateExpenseAction : createExpenseAction,
    undefined
  );
  const keep = useKeepValuesOnError(state);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={expense ? "Modifier la dépense" : "Nouvelle dépense"}>
      <form onSubmit={keep} action={formAction} className="space-y-4">
        {expense && <input type="hidden" name="id" value={expense.id} />}
        <Field label="Libellé" htmlFor="label">
          <Input id="label" name="label" placeholder="Ex : Facture d'électricité" defaultValue={expense?.label} required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant" htmlFor="amount">
            <Input id="amount" name="amount" type="number" inputMode="decimal" min={1} step="any" placeholder="0" defaultValue={expense?.amount} required />
          </Field>
          <Field label="Date" htmlFor="date">
            <Input id="date" name="date" type="date" defaultValue={expense ? expense.date.slice(0, 10) : todayIso()} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Catégorie" htmlFor="category">
            <Select id="category" name="category" defaultValue={expense?.category ?? ""}>
              {expense?.category && !categories.includes(expense.category) && (
                <option value={expense.category}>{expense.category}</option>
              )}
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Règlement" htmlFor="paymentMethod">
            <Select id="paymentMethod" name="paymentMethod" defaultValue={expense?.paymentMethod ?? "ESPECES"}>
              {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Note (facultatif)" htmlFor="note">
          <Textarea id="note" name="note" rows={2} defaultValue={expense?.note ?? ""} />
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

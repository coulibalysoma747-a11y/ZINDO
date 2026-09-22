"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createMedicalActAction, updateMedicalActAction } from "@/lib/actions/medical-acts";

type MedicalAct = { id: string; name: string; defaultFee: number } | null;

export function MedicalActFormModal({
  open,
  act,
  onClose,
}: {
  open: boolean;
  act: MedicalAct;
  onClose: () => void;
}) {
  const router = useRouter();
  const action = act ? updateMedicalActAction.bind(null, act.id) : createMedicalActAction;
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={act ? "Modifier l'acte" : "Nouvel acte médical"}>
      <form action={formAction} className="space-y-4">
        <Field label="Nom de l'acte" htmlFor="name">
          <Input id="name" name="name" placeholder="Ex: Consultation générale" defaultValue={act?.name} required autoFocus />
        </Field>
        <Field label="Tarif par défaut" htmlFor="defaultFee">
          <Input id="defaultFee" name="defaultFee" type="number" min={0} step={1} defaultValue={act?.defaultFee ?? 0} required />
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

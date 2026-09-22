"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createDiagnosisCategoryAction, updateDiagnosisCategoryAction } from "@/lib/actions/diagnosis-categories";

type DiagnosisCategory = { id: string; name: string } | null;

export function DiagnosisCategoryFormModal({
  open,
  category,
  onClose,
}: {
  open: boolean;
  category: DiagnosisCategory;
  onClose: () => void;
}) {
  const router = useRouter();
  const action = category ? updateDiagnosisCategoryAction.bind(null, category.id) : createDiagnosisCategoryAction;
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={category ? "Modifier le diagnostic" : "Nouveau diagnostic"}>
      <form action={formAction} className="space-y-4">
        <Field label="Nom du diagnostic" htmlFor="name">
          <Input id="name" name="name" placeholder="Ex: Paludisme" defaultValue={category?.name} required autoFocus />
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

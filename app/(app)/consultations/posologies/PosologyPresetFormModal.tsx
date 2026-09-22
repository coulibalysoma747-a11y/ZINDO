"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createPosologyPresetAction, updatePosologyPresetAction } from "@/lib/actions/posology-presets";

type PosologyPreset = { id: string; label: string } | null;

export function PosologyPresetFormModal({
  open,
  preset,
  onClose,
}: {
  open: boolean;
  preset: PosologyPreset;
  onClose: () => void;
}) {
  const router = useRouter();
  const action = preset ? updatePosologyPresetAction.bind(null, preset.id) : createPosologyPresetAction;
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={preset ? "Modifier la posologie" : "Nouvelle posologie"}>
      <form action={formAction} className="space-y-4">
        <Field label="Consigne de prise" htmlFor="label">
          <Input id="label" name="label" placeholder="Ex: 1 le matin et 1 le soir" defaultValue={preset?.label} required autoFocus />
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

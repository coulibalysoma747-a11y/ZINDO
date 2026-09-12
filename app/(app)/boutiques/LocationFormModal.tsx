"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createLocationAction, updateLocationAction, type ActionState } from "@/lib/actions/locations";

type Location = {
  id: string;
  name: string;
  type: "BOUTIQUE" | "DEPOT";
  address: string | null;
  city: string | null;
} | null;

export function LocationFormModal({
  open,
  location,
  onClose,
}: {
  open: boolean;
  location: Location;
  onClose: () => void;
}) {
  const router = useRouter();
  const action = location ? updateLocationAction.bind(null, location.id) : createLocationAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={location ? "Modifier la boutique" : "Nouvelle boutique"}>
      <form action={formAction} className="space-y-4">
        <Field label="Nom" htmlFor="name">
          <Input id="name" name="name" defaultValue={location?.name} placeholder="Ex: Boutique Ouagadougou" required autoFocus />
        </Field>
        <Field label="Type" htmlFor="type">
          <Select id="type" name="type" defaultValue={location?.type ?? "BOUTIQUE"}>
            <option value="BOUTIQUE">Boutique (point de vente)</option>
            <option value="DEPOT">Dépôt (stockage)</option>
          </Select>
        </Field>
        <Field label="Ville" htmlFor="city">
          <Input id="city" name="city" defaultValue={location?.city ?? ""} />
        </Field>
        <Field label="Adresse" htmlFor="address">
          <Input id="address" name="address" defaultValue={location?.address ?? ""} />
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

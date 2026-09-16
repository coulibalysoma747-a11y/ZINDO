"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createBrandAction, updateBrandAction } from "@/lib/actions/brands";

type Brand = { id: string; name: string } | null;

export function BrandFormModal({ open, brand, onClose }: { open: boolean; brand: Brand; onClose: () => void }) {
  const router = useRouter();
  const action = brand ? updateBrandAction.bind(null, brand.id) : createBrandAction;
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={brand ? "Modifier la marque" : "Nouvelle marque"}>
      <form action={formAction} className="space-y-4">
        <Field label="Nom" htmlFor="name">
          <Input id="name" name="name" defaultValue={brand?.name} required autoFocus />
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

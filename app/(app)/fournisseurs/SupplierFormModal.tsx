"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createSupplierAction, updateSupplierAction, type ActionState } from "@/lib/actions/suppliers";

type Supplier = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
} | null;

export function SupplierFormModal({
  open,
  onClose,
  supplier,
}: {
  open: boolean;
  onClose: () => void;
  supplier?: Supplier;
}) {
  const router = useRouter();
  const action = supplier
    ? updateSupplierAction.bind(null, supplier.id)
    : createSupplierAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={supplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}>
      <form action={formAction} className="space-y-4">
        <Field label="Nom" htmlFor="name">
          <Input id="name" name="name" defaultValue={supplier?.name} required autoFocus />
        </Field>
        <Field label="Entreprise (facultatif)" htmlFor="company">
          <Input id="company" name="company" defaultValue={supplier?.company ?? ""} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Téléphone" htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={supplier?.phone ?? ""} />
          </Field>
          <Field label="E-mail" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={supplier?.email ?? ""} />
          </Field>
        </div>
        <Field label="Adresse" htmlFor="address">
          <Input id="address" name="address" defaultValue={supplier?.address ?? ""} />
        </Field>
        <Field label="Notes" htmlFor="notes">
          <Textarea id="notes" name="notes" rows={2} defaultValue={supplier?.notes ?? ""} />
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

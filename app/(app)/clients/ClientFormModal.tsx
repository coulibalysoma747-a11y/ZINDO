"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createCustomerAction, updateCustomerAction, type ActionState } from "@/lib/actions/customers";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  creditLimit: number;
} | null;

export function ClientFormModal({
  open,
  onClose,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  customer?: Customer;
}) {
  const router = useRouter();
  const action = customer ? updateCustomerAction.bind(null, customer.id) : createCustomerAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Modal open={open} onClose={onClose} title={customer ? "Modifier le client" : "Nouveau client"}>
      <form action={formAction} className="space-y-4">
        <Field label="Nom" htmlFor="name">
          <Input id="name" name="name" defaultValue={customer?.name} required autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Téléphone" htmlFor="phone">
            <Input id="phone" name="phone" defaultValue={customer?.phone ?? ""} />
          </Field>
          <Field label="E-mail" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={customer?.email ?? ""} />
          </Field>
        </div>
        <Field label="Adresse" htmlFor="address">
          <Input id="address" name="address" defaultValue={customer?.address ?? ""} />
        </Field>
        <Field label="Limite de crédit autorisée" htmlFor="creditLimit" hint="0 = pas de limite définie">
          <Input
            id="creditLimit"
            name="creditLimit"
            type="number"
            min={0}
            defaultValue={customer?.creditLimit ?? 0}
          />
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

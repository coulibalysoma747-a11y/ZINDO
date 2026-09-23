"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createCustomerJsonAction, updateCustomerAction, type ActionState } from "@/lib/actions/customers";
import { queueOfflineWrite } from "@/lib/offline/db";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  creditLimit: number;
} | null;

/**
 * La création hors ligne (voir lib/offline/) n'est proposée qu'à la création
 * d'un nouveau client — modifier un client déjà synchronisé nécessite de le
 * cibler par son id serveur réel, donc reste en ligne uniquement (voir la
 * note dans le plan sur les écritures de type "update").
 */
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
  const [updateState, updateFormAction, updatePending] = useActionState<ActionState, FormData>(
    customer ? updateCustomerAction.bind(null, customer.id) : async () => undefined,
    undefined
  );

  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [creditLimit, setCreditLimit] = useState(String(customer?.creditLimit ?? 0));
  const [createError, setCreateError] = useState<string | null>(null);
  const [createPending, startCreateTransition] = useTransition();

  useEffect(() => {
    if (updateState?.success) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateState]);

  function handleCreateSubmit() {
    setCreateError(null);
    if (!name.trim()) {
      setCreateError("Le nom est requis");
      return;
    }
    const input = {
      name: name.trim(),
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      creditLimit: Number(creditLimit) || 0,
    };

    startCreateTransition(async () => {
      if (!navigator.onLine) {
        const clientRef = crypto.randomUUID();
        await queueOfflineWrite({
          clientRef,
          kind: "customer",
          createdAt: new Date().toISOString(),
          input: { ...input, clientRef },
          label: input.name,
        });
        router.refresh();
        onClose();
        return;
      }

      const result = await createCustomerJsonAction(input);
      if (!result.success) {
        setCreateError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  const pending = customer ? updatePending : createPending;

  return (
    <Modal open={open} onClose={onClose} title={customer ? "Modifier le client" : "Nouveau client"}>
      <form
        action={customer ? updateFormAction : undefined}
        onSubmit={
          customer
            ? undefined
            : (e) => {
                e.preventDefault();
                handleCreateSubmit();
              }
        }
        className="space-y-4"
      >
        <Field label="Nom" htmlFor="name">
          <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Téléphone" htmlFor="phone">
            <Input id="phone" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="E-mail" htmlFor="email">
            <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <Field label="Adresse" htmlFor="address">
          <Input id="address" name="address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Limite de crédit autorisée" htmlFor="creditLimit" hint="0 = pas de limite définie">
          <Input
            id="creditLimit"
            name="creditLimit"
            type="number"
            min={0}
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
          />
        </Field>
        {(customer ? updateState?.error : createError) && (
          <p className="text-sm text-red-600">{customer ? updateState?.error : createError}</p>
        )}
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

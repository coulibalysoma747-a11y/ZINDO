"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createSupplierJsonAction, updateSupplierAction, type ActionState } from "@/lib/actions/suppliers";
import { queueOfflineWrite } from "@/lib/offline/db";

type Supplier = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  /** Présent seulement quand le réassort intelligent est activé (voir [id]/page.tsx). */
  leadTimeDays?: number | null;
} | null;

/**
 * La création hors ligne (voir lib/offline/) n'est proposée qu'à la création
 * d'un nouveau fournisseur — modifier un fournisseur déjà synchronisé reste
 * en ligne uniquement (même raisonnement que ClientFormModal).
 */
export function SupplierFormModal({
  open,
  onClose,
  supplier,
  showLeadTime = false,
}: {
  open: boolean;
  onClose: () => void;
  supplier?: Supplier;
  showLeadTime?: boolean;
}) {
  const router = useRouter();
  const [updateState, updateFormAction, updatePending] = useActionState<ActionState, FormData>(
    supplier ? updateSupplierAction.bind(null, supplier.id) : async () => undefined,
    undefined
  );

  const [name, setName] = useState(supplier?.name ?? "");
  const [company, setCompany] = useState(supplier?.company ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
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
      company: company || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      notes: notes || undefined,
    };

    startCreateTransition(async () => {
      if (!navigator.onLine) {
        const clientRef = crypto.randomUUID();
        await queueOfflineWrite({
          clientRef,
          kind: "supplier",
          createdAt: new Date().toISOString(),
          input: { ...input, clientRef },
          label: input.name,
        });
        router.refresh();
        onClose();
        return;
      }

      const result = await createSupplierJsonAction(input);
      if (!result.success) {
        setCreateError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  const pending = supplier ? updatePending : createPending;

  return (
    <Modal open={open} onClose={onClose} title={supplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}>
      <form
        action={supplier ? updateFormAction : undefined}
        onSubmit={
          supplier
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
        <Field label="Entreprise (facultatif)" htmlFor="company">
          <Input id="company" name="company" value={company} onChange={(e) => setCompany(e.target.value)} />
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
        {supplier && showLeadTime && (
          <Field label="Délai de livraison habituel (jours)" htmlFor="leadTimeDays" hint="Utilisé par le réassort pour éviter les ruptures avant la livraison. Vide = 7 jours.">
            <Input id="leadTimeDays" name="leadTimeDays" type="number" min={0} defaultValue={supplier.leadTimeDays ?? ""} />
          </Field>
        )}
        <Field label="Notes" htmlFor="notes">
          <Textarea id="notes" name="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {(supplier ? updateState?.error : createError) && (
          <p className="text-sm text-red-600">{supplier ? updateState?.error : createError}</p>
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

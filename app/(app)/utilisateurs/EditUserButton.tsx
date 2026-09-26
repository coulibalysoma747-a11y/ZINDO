"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateUserInfoAction, type ActionState } from "@/lib/actions/users";

type EditableUser = { id: string; firstName: string; lastName: string; phone: string };

/** Corriger le nom ou le téléphone d'un employé (flag modifier_supprimer_partout). */
export function EditUserButton({ user }: { user: EditableUser }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const res = await updateUserInfoAction(prev, fd);
    if (res?.success) {
      setOpen(false);
      router.refresh();
    }
    return res;
  }, undefined);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-slate-800"
        aria-label="Modifier l'utilisateur"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Modifier l'utilisateur">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={user.id} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" htmlFor={`firstName-${user.id}`}>
              <Input id={`firstName-${user.id}`} name="firstName" defaultValue={user.firstName} required />
            </Field>
            <Field label="Nom" htmlFor={`lastName-${user.id}`}>
              <Input id={`lastName-${user.id}`} name="lastName" defaultValue={user.lastName} required />
            </Field>
          </div>
          <Field label="Téléphone" htmlFor={`phone-${user.id}`} hint="C'est le numéro utilisé pour se connecter.">
            <Input id={`phone-${user.id}`} name="phone" type="tel" defaultValue={user.phone} required />
          </Field>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

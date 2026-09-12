"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createAdminAction, type ActionState } from "@/lib/actions/admin-management";

export function CreateAdminForm() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createAdminAction, undefined);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Nouvel administrateur
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nouveau compte administrateur">
        <form action={formAction} className="space-y-4">
          <Field label="Nom" htmlFor="name">
            <Input id="name" name="name" required autoFocus />
          </Field>
          <Field label="E-mail" htmlFor="email">
            <Input id="email" name="email" type="email" required />
          </Field>
          <Field label="Code d'accès" htmlFor="password" hint="Minimum 8 caractères.">
            <Input id="password" name="password" type="password" required />
          </Field>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

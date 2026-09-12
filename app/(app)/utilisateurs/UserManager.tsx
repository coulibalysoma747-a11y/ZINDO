"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { createUserAction, type ActionState } from "@/lib/actions/users";
import { ROLE_LABELS } from "@/lib/permissions";

export function UserManager() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createUserAction, undefined);

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
        <Plus className="h-4 w-4" /> Nouvel utilisateur
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nouvel utilisateur">
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom" htmlFor="firstName">
              <Input id="firstName" name="firstName" required autoFocus />
            </Field>
            <Field label="Nom" htmlFor="lastName">
              <Input id="lastName" name="lastName" required />
            </Field>
          </div>
          <Field label="Téléphone" htmlFor="phone">
            <Input id="phone" name="phone" required />
          </Field>
          <Field label="E-mail (facultatif)" htmlFor="email">
            <Input id="email" name="email" type="email" />
          </Field>
          <Field label="Mot de passe" htmlFor="password">
            <Input id="password" name="password" type="password" minLength={6} required />
          </Field>
          <Field label="Rôle" htmlFor="role">
            <Select id="role" name="role" defaultValue="VENDEUR">
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
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

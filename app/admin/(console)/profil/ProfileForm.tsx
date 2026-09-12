"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateSuperAdminProfileAction, type ActionState } from "@/lib/actions/admin-auth";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateSuperAdminProfileAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Nom" htmlFor="name">
        <Input id="name" name="name" defaultValue={name} required />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" defaultValue={email} required />
      </Field>
      <Field
        label="Nouveau code d'accès (facultatif)"
        htmlFor="newPassword"
        hint="Laissez vide pour ne pas le changer. Minimum 8 caractères."
      >
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" />
      </Field>
      <Field label="Code d'accès actuel" htmlFor="currentPassword" hint="Requis pour confirmer toute modification.">
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateProfileAction, type ActionState } from "@/lib/actions/settings";

export function ProfileForm({
  user,
}: {
  user: { firstName: string; lastName: string; email: string | null; phone: string };
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateProfileAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" htmlFor="firstName">
          <Input id="firstName" name="firstName" defaultValue={user.firstName} required />
        </Field>
        <Field label="Nom" htmlFor="lastName">
          <Input id="lastName" name="lastName" defaultValue={user.lastName} required />
        </Field>
      </div>
      <Field label="Téléphone" htmlFor="phone" hint="Le téléphone ne peut pas être modifié ici">
        <Input id="phone" value={user.phone} disabled />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" defaultValue={user.email ?? ""} />
      </Field>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}

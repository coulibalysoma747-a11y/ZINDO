"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { changePasswordAction, type ActionState } from "@/lib/actions/settings";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    changePasswordAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Mot de passe actuel" htmlFor="currentPassword">
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </Field>
      <Field label="Nouveau mot de passe" htmlFor="newPassword">
        <Input id="newPassword" name="newPassword" type="password" minLength={6} required />
      </Field>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Modification..." : "Changer le mot de passe"}
      </Button>
    </form>
  );
}

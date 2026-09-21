"use client";

import { useActionState } from "react";
import { submitGoogleSignupProfileAction } from "@/lib/actions/google-signup";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function GoogleSignupProfileForm() {
  const [state, action, pending] = useActionState(submitGoogleSignupProfileAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <Field label="Téléphone" htmlFor="phone">
        <Input id="phone" name="phone" placeholder="70 00 00 00" required autoFocus />
      </Field>
      <Field label="Nom du commerce" htmlFor="businessName">
        <Input id="businessName" name="businessName" placeholder="Ex: Quincaillerie Diallo" required />
      </Field>
      <Field label="Ville" htmlFor="city">
        <Input id="city" name="city" placeholder="Ouagadougou" />
      </Field>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Envoi du code..." : "Continuer"}
      </Button>
    </form>
  );
}

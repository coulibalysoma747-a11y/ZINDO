"use client";

import { useActionState } from "react";
import { registerAction } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom" htmlFor="firstName">
          <Input id="firstName" name="firstName" required />
        </Field>
        <Field label="Nom" htmlFor="lastName">
          <Input id="lastName" name="lastName" required />
        </Field>
      </div>
      <Field label="Téléphone" htmlFor="phone">
        <Input id="phone" name="phone" placeholder="70 00 00 00" required />
      </Field>
      <Field label="E-mail (facultatif)" htmlFor="email">
        <Input id="email" name="email" type="email" />
      </Field>
      <Field label="Mot de passe" htmlFor="password">
        <Input id="password" name="password" type="password" minLength={6} required />
      </Field>
      <hr className="border-zinc-100" />
      <Field label="Nom du commerce" htmlFor="businessName">
        <Input id="businessName" name="businessName" placeholder="Ex: Quincaillerie Diallo" required />
      </Field>
      <Field label="Ville" htmlFor="city">
        <Input id="city" name="city" placeholder="Ouagadougou" />
      </Field>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Création..." : "Créer mon compte"}
      </Button>
    </form>
  );
}

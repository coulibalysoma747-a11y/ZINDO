"use client";

import { useActionState, useState } from "react";
import { submitGoogleSignupProfileAction } from "@/lib/actions/google-signup";
import { keepFormValues } from "@/lib/keep-form-values";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CountryCityPicker } from "@/components/ui/CountryCityPicker";
import { DEFAULT_COUNTRY_CODE, getCountry, type CountryCode } from "@/lib/countries";

export function GoogleSignupProfileForm() {
  const [state, action, pending] = useActionState(submitGoogleSignupProfileAction, undefined);
  const [countryCode, setCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  const country = getCountry(countryCode);

  return (
    <form action={action} onSubmit={keepFormValues(action)} className="space-y-4">
      <CountryCityPicker onCountryChange={(c) => setCountryCode(c.code)} />
      <Field label="Téléphone" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={country.phoneExample || "Numéro de téléphone"} required />
      </Field>
      <Field label="Nom du commerce" htmlFor="businessName">
        <Input id="businessName" name="businessName" autoComplete="organization" autoCapitalize="words" placeholder="Ex: Quincaillerie Diallo" required />
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

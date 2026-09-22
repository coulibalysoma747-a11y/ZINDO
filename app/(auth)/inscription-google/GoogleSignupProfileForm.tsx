"use client";

import { useActionState, useState } from "react";
import { submitGoogleSignupProfileAction } from "@/lib/actions/google-signup";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { COUNTRIES, DEFAULT_COUNTRY_CODE, getCountry, type CountryCode } from "@/lib/countries";

export function GoogleSignupProfileForm() {
  const [state, action, pending] = useActionState(submitGoogleSignupProfileAction, undefined);
  const [countryCode, setCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  const country = getCountry(countryCode);

  return (
    <form action={action} className="space-y-4">
      <Field label="Pays" htmlFor="country">
        <select
          id="country"
          name="country"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value as CountryCode)}
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[15px] text-zindo-ink-900 outline-none transition focus:border-zindo-green-500 focus:ring-4 focus:ring-zindo-green-100"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name.fr} ({c.dialCode})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Téléphone" htmlFor="phone">
        <Input id="phone" name="phone" placeholder={country.phoneExample} required autoFocus />
      </Field>
      <Field label="Nom du commerce" htmlFor="businessName">
        <Input id="businessName" name="businessName" placeholder="Ex: Quincaillerie Diallo" required />
      </Field>
      <Field label="Ville" htmlFor="city">
        <Input id="city" name="city" placeholder={country.capital} />
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

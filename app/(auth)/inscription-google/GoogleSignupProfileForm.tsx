"use client";

import { useActionState, useState } from "react";
import { submitGoogleSignupProfileAction } from "@/lib/actions/google-signup";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { COUNTRIES, getCountry, type CountryCode } from "@/lib/countries";

export function GoogleSignupProfileForm() {
  const [state, action, pending] = useActionState(submitGoogleSignupProfileAction, undefined);
  const [countryCode, setCountryCode] = useState<CountryCode | "">("");
  const country = countryCode ? getCountry(countryCode) : null;

  return (
    <form action={action} className="space-y-4">
      <Field label="Pays" htmlFor="country">
        <select
          id="country"
          name="country"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value as CountryCode)}
          required
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[15px] text-zindo-ink-900 outline-none transition focus:border-zindo-green-500 focus:ring-4 focus:ring-zindo-green-100"
        >
          <option value="" disabled>
            Sélectionnez votre pays
          </option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name.fr} ({c.dialCode})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Téléphone" htmlFor="phone">
        <Input id="phone" name="phone" placeholder={country?.phoneExample ?? "Numéro de téléphone"} required autoFocus />
      </Field>
      <Field label="Nom du commerce" htmlFor="businessName">
        <Input id="businessName" name="businessName" placeholder="Ex: Quincaillerie Diallo" required />
      </Field>
      <Field label="Ville" htmlFor="city">
        <Input id="city" name="city" placeholder={country?.capital ?? "Ville"} />
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

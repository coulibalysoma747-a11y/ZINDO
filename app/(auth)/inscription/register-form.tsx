"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { COUNTRIES, DEFAULT_COUNTRY_CODE, getCountry, type CountryCode } from "@/lib/countries";

const TEXT = {
  fr: {
    firstName: "Prénom",
    lastName: "Nom",
    phone: "Téléphone",
    email: "E-mail (facultatif)",
    password: "Mot de passe",
    businessName: "Nom du commerce",
    businessPlaceholder: "Ex: Quincaillerie Diallo",
    country: "Pays",
    city: "Ville",
    acceptPrefix: "J'accepte les",
    terms: "conditions générales d'utilisation",
    and: "et la",
    privacy: "politique de confidentialité",
    submitting: "Création...",
    submit: "Créer mon compte",
    cguHref: "/cgu",
    confidentialiteHref: "/confidentialite",
  },
  en: {
    firstName: "First name",
    lastName: "Last name",
    phone: "Phone",
    email: "Email (optional)",
    password: "Password",
    businessName: "Business name",
    businessPlaceholder: "E.g. Diallo Hardware Store",
    country: "Country",
    city: "City",
    acceptPrefix: "I accept the",
    terms: "Terms of Service",
    and: "and the",
    privacy: "Privacy Policy",
    submitting: "Creating...",
    submit: "Create my account",
    cguHref: "/en/cgu",
    confidentialiteHref: "/en/confidentialite",
  },
} as const;

export function RegisterForm({ locale = "fr" }: { locale?: "fr" | "en" }) {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const [countryCode, setCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  const t = TEXT[locale];
  const country = getCountry(countryCode);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.firstName} htmlFor="firstName">
          <Input id="firstName" name="firstName" required />
        </Field>
        <Field label={t.lastName} htmlFor="lastName">
          <Input id="lastName" name="lastName" required />
        </Field>
      </div>
      <Field label={t.country} htmlFor="country">
        <select
          id="country"
          name="country"
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value as CountryCode)}
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[15px] text-zindo-ink-900 outline-none transition focus:border-zindo-green-500 focus:ring-4 focus:ring-zindo-green-100"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name[locale]} ({c.dialCode})
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.phone} htmlFor="phone">
        <Input id="phone" name="phone" placeholder={country.phoneExample} required />
      </Field>
      <Field label={t.email} htmlFor="email">
        <Input id="email" name="email" type="email" />
      </Field>
      <Field label={t.password} htmlFor="password">
        <Input id="password" name="password" type="password" minLength={6} required />
      </Field>
      <hr className="border-zinc-100" />
      <Field label={t.businessName} htmlFor="businessName">
        <Input id="businessName" name="businessName" placeholder={t.businessPlaceholder} required />
      </Field>
      <Field label={t.city} htmlFor="city">
        <Input id="city" name="city" placeholder={country.capital} />
      </Field>
      <label className="flex items-start gap-2.5 text-sm text-zinc-600">
        <input
          type="checkbox"
          name="acceptTerms"
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded accent-zindo-green-500"
        />
        <span>
          {t.acceptPrefix}{" "}
          <Link href={t.cguHref} target="_blank" className="font-medium text-zindo-green-600 hover:underline">
            {t.terms}
          </Link>{" "}
          {t.and}{" "}
          <Link href={t.confidentialiteHref} target="_blank" className="font-medium text-zindo-green-600 hover:underline">
            {t.privacy}
          </Link>
          .
        </span>
      </label>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

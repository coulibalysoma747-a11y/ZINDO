"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/actions/auth";
import { keepFormValues } from "@/lib/keep-form-values";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DEFAULT_COUNTRY_CODE, getCountry, type CountryCode } from "@/lib/countries";
import { CountryCityPicker } from "@/components/ui/CountryCityPicker";

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
    countryPlaceholder: "Sélectionnez votre pays",
    phonePlaceholder: "Numéro de téléphone",
    cityPlaceholder: "Ville",
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
    countryPlaceholder: "Select your country",
    phonePlaceholder: "Phone number",
    cityPlaceholder: "City",
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

export function RegisterForm({
  locale = "fr",
  referralCode = null,
  showReferralField = false,
}: {
  locale?: "fr" | "en";
  /** Code reçu via un lien de parrainage (zindo.site/r/CODE) — voir lib/referral.ts. */
  referralCode?: string | null;
  /** Champ visible (module parrainage activé globalement, ou arrivée par un lien). */
  showReferralField?: boolean;
}) {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const [countryCode, setCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  const t = TEXT[locale];
  const country = getCountry(countryCode);

  return (
    <form action={action} onSubmit={keepFormValues(action)} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.firstName} htmlFor="firstName">
          <Input id="firstName" name="firstName" autoComplete="given-name" autoCapitalize="words" required />
        </Field>
        <Field label={t.lastName} htmlFor="lastName">
          <Input id="lastName" name="lastName" autoComplete="family-name" autoCapitalize="words" required />
        </Field>
      </div>
      <CountryCityPicker
        locale={locale}
        countryLabel={t.country}
        cityLabel={t.city}
        onCountryChange={(c) => setCountryCode(c.code)}
      />
      <Field label={t.phone} htmlFor="phone">
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder={country.phoneExample || t.phonePlaceholder} required />
      </Field>
      <Field label={t.email} htmlFor="email">
        <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" />
      </Field>
      <Field label={t.password} htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={6} required />
      </Field>
      <hr className="border-zinc-100" />
      <Field label={t.businessName} htmlFor="businessName">
        <Input id="businessName" name="businessName" autoComplete="organization" autoCapitalize="words" placeholder={t.businessPlaceholder} required />
      </Field>
      {showReferralField && (
        <Field label={locale === "en" ? "Referral code (optional)" : "Code de parrainage (facultatif)"} htmlFor="referralCode">
          <Input
            id="referralCode"
            name="referralCode"
            defaultValue={referralCode ?? ""}
            placeholder="Ex. SOMA7K"
            autoCapitalize="characters"
          />
        </Field>
      )}
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

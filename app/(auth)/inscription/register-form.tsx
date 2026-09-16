"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const TEXT = {
  fr: {
    firstName: "Prénom",
    lastName: "Nom",
    phone: "Téléphone",
    email: "E-mail (facultatif)",
    password: "Mot de passe",
    businessName: "Nom du commerce",
    businessPlaceholder: "Ex: Quincaillerie Diallo",
    city: "Ville",
    cityPlaceholder: "Ouagadougou",
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
    city: "City",
    cityPlaceholder: "Ouagadougou",
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
  const t = TEXT[locale];

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
      <Field label={t.phone} htmlFor="phone">
        <Input id="phone" name="phone" placeholder="70 00 00 00" required />
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
        <Input id="city" name="city" placeholder={t.cityPlaceholder} />
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

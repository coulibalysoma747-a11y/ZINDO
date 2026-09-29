"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { registerAction } from "@/lib/actions/auth";
import { keepFormValues } from "@/lib/keep-form-values";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DEFAULT_COUNTRY_CODE, getCountry, type CountryCode } from "@/lib/countries";
import { CountryCityPicker } from "@/components/ui/CountryCityPicker";

const TEXT = {
  fr: {
    step: "Étape",
    of: "sur",
    step1Title: "Votre commerce",
    step1Subtitle: "Quelques informations pour préparer votre espace.",
    step2Title: "Vos accès",
    step2Subtitle: "Vous vous connecterez avec votre numéro et votre mot de passe.",
    next: "Continuer",
    back: "Retour",
    firstName: "Prénom",
    lastName: "Nom",
    phone: "Téléphone",
    email: "E-mail (facultatif)",
    password: "Mot de passe",
    passwordHint: "6 caractères minimum.",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    businessName: "Nom du commerce",
    businessPlaceholder: "Ex. Quincaillerie Diallo",
    country: "Pays",
    city: "Ville",
    phonePlaceholder: "Numéro de téléphone",
    acceptPrefix: "J'accepte les",
    terms: "conditions générales d'utilisation",
    and: "et la",
    privacy: "politique de confidentialité",
    submitting: "Création de votre compte…",
    submit: "Créer mon compte",
    reassurance: (days: number) => [`${days} jours d'essai gratuit`, "Sans carte bancaire", "Données protégées"],
    referral: "Code de parrainage (facultatif)",
    cguHref: "/cgu",
    confidentialiteHref: "/confidentialite",
  },
  en: {
    step: "Step",
    of: "of",
    step1Title: "Your business",
    step1Subtitle: "A few details to set up your workspace.",
    step2Title: "Your login",
    step2Subtitle: "You will sign in with your phone number and password.",
    next: "Continue",
    back: "Back",
    firstName: "First name",
    lastName: "Last name",
    phone: "Phone",
    email: "Email (optional)",
    password: "Password",
    passwordHint: "At least 6 characters.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    businessName: "Business name",
    businessPlaceholder: "E.g. Diallo Hardware Store",
    country: "Country",
    city: "City",
    phonePlaceholder: "Phone number",
    acceptPrefix: "I accept the",
    terms: "Terms of Service",
    and: "and the",
    privacy: "Privacy Policy",
    submitting: "Creating your account…",
    submit: "Create my account",
    reassurance: (days: number) => [`${days}-day free trial`, "No credit card", "Data protected"],
    referral: "Referral code (optional)",
    cguHref: "/en/cgu",
    confidentialiteHref: "/en/confidentialite",
  },
} as const;

/**
 * Inscription en deux étapes (commerce, puis accès) dans un seul formulaire :
 * le serveur reçoit les mêmes champs qu'avant. L'étape 1 est vérifiée avant
 * de passer à la suivante ; après une erreur du serveur, l'étape 2 reste affichée.
 */
export function RegisterForm({
  locale = "fr",
  referralCode = null,
  showReferralField = false,
  trialDays = 14,
}: {
  locale?: "fr" | "en";
  /** Code reçu via un lien de parrainage (zindo.site/r/CODE) — voir lib/referral.ts. */
  referralCode?: string | null;
  /** Champ visible (module parrainage activé globalement, ou arrivée par un lien). */
  showReferralField?: boolean;
  /** Durée de l'essai gratuit affichée sous le bouton. */
  trialDays?: number;
}) {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const [countryCode, setCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const step1 = useRef<HTMLDivElement>(null);
  const t = TEXT[locale];
  const country = getCountry(countryCode);
  // Une erreur renvoyée par le serveur concerne l'envoi final : on reste sur l'étape 2.
  const current = state?.error ? 2 : step;

  function goNext() {
    const fields = step1.current?.querySelectorAll<HTMLInputElement>("input[required]") ?? [];
    for (const field of fields) {
      if (!field.reportValidity()) return;
    }
    setStep(2);
  }

  return (
    <form action={action} onSubmit={keepFormValues(action)} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      {/* En-tête : étape et progression. */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zindo-green-700">
          <span>
            {t.step} {current} {t.of} 2
          </span>
          {current === 2 && (
            <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1 normal-case tracking-normal text-zinc-500 hover:text-zinc-800">
              <ArrowLeft className="h-3.5 w-3.5" /> {t.back}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5" aria-hidden>
          <span className="h-1.5 rounded-full bg-zindo-green-500" />
          <span className={`h-1.5 rounded-full transition-colors ${current === 2 ? "bg-zindo-green-500" : "bg-zinc-200"}`} />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">{current === 1 ? t.step1Title : t.step2Title}</h2>
          <p className="mt-0.5 text-sm text-zinc-500">{current === 1 ? t.step1Subtitle : t.step2Subtitle}</p>
        </div>
      </div>

      {/* Étape 1 : le commerce. Masquée (et non retirée) à l'étape 2 pour que ses valeurs soient envoyées. */}
      <div ref={step1} className={current === 1 ? "space-y-4" : "hidden"}>
        <Field label={t.businessName} htmlFor="businessName">
          <Input id="businessName" name="businessName" autoComplete="organization" autoCapitalize="words" placeholder={t.businessPlaceholder} required />
        </Field>
        <CountryCityPicker locale={locale} countryLabel={t.country} cityLabel={t.city} onCountryChange={(c) => setCountryCode(c.code)} />
        <Button type="button" className="h-11 w-full" onClick={goNext}>
          {t.next}
        </Button>
      </div>

      {/* Étape 2 : la personne et ses accès. */}
      <div className={current === 2 ? "space-y-4" : "hidden"}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.firstName} htmlFor="firstName">
            <Input id="firstName" name="firstName" autoComplete="given-name" autoCapitalize="words" required={current === 2} />
          </Field>
          <Field label={t.lastName} htmlFor="lastName">
            <Input id="lastName" name="lastName" autoComplete="family-name" autoCapitalize="words" required={current === 2} />
          </Field>
        </div>
        <Field label={t.phone} htmlFor="phone">
          <div className="flex">
            <span className="flex h-10 shrink-0 items-center rounded-l-lg border border-r-0 border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-600">{country.dialCode}</span>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={country.phoneExample || t.phonePlaceholder}
              required={current === 2}
              className="rounded-l-none"
            />
          </div>
        </Field>
        <Field label={t.email} htmlFor="email">
          <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" />
        </Field>
        <Field label={t.password} htmlFor="password" hint={t.passwordHint}>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={6}
              required={current === 2}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t.hidePassword : t.showPassword}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 hover:text-zinc-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        {showReferralField && (
          <Field label={t.referral} htmlFor="referralCode">
            <Input id="referralCode" name="referralCode" defaultValue={referralCode ?? ""} placeholder="Ex. SOMA7K" autoCapitalize="characters" />
          </Field>
        )}
        <label className="flex items-start gap-2.5 text-sm text-zinc-600">
          <input type="checkbox" name="acceptTerms" required={current === 2} className="mt-0.5 h-4 w-4 shrink-0 rounded accent-zindo-green-500" />
          <span>
            {t.acceptPrefix}{" "}
            <Link href={t.cguHref} target="_blank" className="font-medium text-zindo-green-700 hover:underline">
              {t.terms}
            </Link>{" "}
            {t.and}{" "}
            <Link href={t.confidentialiteHref} target="_blank" className="font-medium text-zindo-green-700 hover:underline">
              {t.privacy}
            </Link>
            .
          </span>
        </label>
        {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        <Button type="submit" className="h-11 w-full" disabled={pending}>
          {pending ? t.submitting : t.submit}
        </Button>
      </div>

      {/* Réassurance. */}
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
        {t.reassurance(trialDays).map((item, i) => (
          <li key={item} className="inline-flex items-center gap-1.5">
            {i === 0 ? <Check className="h-3.5 w-3.5 text-zindo-green-600" /> : i === 1 ? <Lock className="h-3.5 w-3.5 text-zindo-green-600" /> : <ShieldCheck className="h-3.5 w-3.5 text-zindo-green-600" />}
            {item}
          </li>
        ))}
      </ul>
    </form>
  );
}

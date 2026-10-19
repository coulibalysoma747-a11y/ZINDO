import { getTrialDays } from "@/lib/platform-config";
import { getPlanOffers } from "@/lib/plan-catalog";
import Link from "next/link";
import { Check, Gift, Calendar, CreditCard, ShieldCheck, Lock, Headphones, RefreshCw, ArrowRight } from "lucide-react";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { GoogleIcon } from "@/components/icons/GoogleIcon";

// Durée de l'essai réglable depuis la console admin (qui revalide aussi
// cette page à l'enregistrement) : relecture au plus toutes les heures.
export const revalidate = 3600;

const TRUST_BADGES = [
  { icon: ShieldCheck, title: "Sans engagement", text: "Résiliez à tout moment" },
  { icon: Lock, title: "Paiement sécurisé", text: "Vos données sont protégées" },
  { icon: Headphones, title: "Support réactif", text: "Une équipe à votre écoute" },
  { icon: RefreshCw, title: "Mises à jour incluses", text: "Toujours la meilleure version" },
];

export default async function TarifsPage() {
  const trialDays = await getTrialDays();
  const planOffers = await getPlanOffers();
  const plans = planOffers.map((plan) => {
    const annualSaving = Math.max(0, plan.monthlyPrice * 12 - plan.annualPrice);
    const limitText = [
      plan.maxProducts === null ? "Produits illimités" : `${plan.maxProducts} produits maximum`,
      plan.maxUsers === null ? "Utilisateurs illimités" : `${plan.maxUsers} utilisateur(s)`,
      plan.maxLocations === null ? "Boutiques illimitées" : `${plan.maxLocations} boutique(s)`,
    ];
    const features = plan.key === "free"
      ? [...limitText, "Caisse, stock, clients et tickets"]
      : plan.key === "starter"
        ? [...limitText, "Crédits, dépenses, inventaire et rapports"]
        : [...limitText, "Tous les modules et support prioritaire", ...(annualSaving > 0 ? [`${annualSaving.toLocaleString("fr-FR")} FCFA d’économie avec le paiement annuel`] : [])];
    return {
      key: plan.key,
      badge: plan.key === "free" ? "GRATUIT" : plan.key === "starter" ? "ESSENTIEL" : "COMPLET",
      badgeClass: plan.key === "free" ? "bg-zindo-green-500/15 text-zindo-green-400" : plan.key === "pro" ? "bg-zindo-gold-500/15 text-zindo-gold-400" : "bg-white/10 text-slate-300",
      icon: plan.key === "free" ? Gift : plan.key === "pro" ? Calendar : CreditCard,
      title: plan.label,
      price: plan.monthlyPrice.toLocaleString("fr-FR"),
      priceSuffix: plan.monthlyPrice === 0 ? "FCFA / toujours" : `FCFA / mois${plan.annualPrice > 0 ? ` ou ${plan.annualPrice.toLocaleString("fr-FR")} FCFA / an` : ""}`,
      features,
      cta: plan.key === "free" ? "Créer mon compte gratuit" : "Essayer gratuitement",
      ctaClass: plan.key === "free" ? "border border-zindo-green-500 text-zindo-green-400 hover:bg-zindo-green-500/10" : plan.key === "pro" ? "bg-zindo-gold-500 text-zindo-ink-900 hover:bg-zindo-gold-400" : "border border-white/20 text-white hover:bg-white/10",
      highlighted: plan.key === "pro",
    };
  });
  return (
    <div className="theme-locked min-h-screen bg-zindo-ink-900">
      <div aria-hidden className="zindo-flag-stripe h-1 w-full" />

      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-y-2 px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <ZindoLogo size={40} />
          <span className="text-lg font-extrabold tracking-tight text-white">ZINDO</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3">
          <Link
            href="/login"
            className="whitespace-nowrap rounded-xl px-2 py-2 text-sm font-semibold text-slate-300 hover:text-white sm:px-4"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="whitespace-nowrap rounded-xl bg-zindo-green-500 px-2.5 py-2 text-sm font-bold text-white shadow-md shadow-zindo-green-500/25 transition hover:bg-zindo-green-600 sm:px-5"
          >
            Créer un compte
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 pb-24 pt-4 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zindo-green-400">
            Abonnement
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            Choisissez la formule qui correspond à <span className="text-zindo-green-400">votre commerce</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400 sm:text-base">
            Essayez les fonctions Entreprise gratuitement pendant {trialDays} jours. Ensuite, votre compte passe au forfait Free ; vous pouvez passer à une formule payante à tout moment.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                plan.highlighted
                  ? "border-zindo-gold-500 bg-white/[0.04] shadow-lg shadow-zindo-gold-500/10"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-zindo-gold-500 px-3 py-1 text-[11px] font-bold text-zindo-ink-900">
                  {plan.badge}
                </span>
              )}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                <plan.icon className="h-5 w-5 text-white" />
              </div>
              {!plan.highlighted && (
                <span className={`mt-4 inline-block w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold ${plan.badgeClass}`}>
                  {plan.badge}
                </span>
              )}
              <p className={`font-bold text-white ${plan.highlighted ? "mt-6" : "mt-3"}`}>{plan.title}</p>
              <p className="mt-2 text-3xl font-extrabold text-white">{plan.price}</p>
              {plan.priceSuffix && <p className="text-sm font-medium text-slate-400">{plan.priceSuffix}</p>}

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-zindo-green-400" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/inscription"
                className={`mt-6 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${plan.ctaClass}`}
              >
                {plan.cta} <ArrowRight className="h-4 w-4" />
              </Link>
              {plan.key === "free" && (
                <a
                  href="/api/auth/google"
                  className="mt-2.5 flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  <GoogleIcon className="h-4 w-4" />
                  Continuer avec Google
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {TRUST_BADGES.map((b) => (
            <div key={b.title} className="flex items-start gap-2.5">
              <b.icon className="mt-0.5 h-4 w-4 shrink-0 text-zindo-green-400" />
              <div>
                <p className="text-sm font-semibold text-white">{b.title}</p>
                <p className="text-xs text-slate-400">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

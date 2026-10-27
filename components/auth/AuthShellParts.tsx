"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChevronRight, MessageCircle, ShieldCheck, WifiOff, Check } from "lucide-react";

export const SUPPORT_WHATSAPP_HREF = "https://wa.me/22604059929";
export const SUPPORT_WHATSAPP_LABEL = "+226 04 05 99 29";

type Locale = "fr" | "en";
type Page = "login" | "signup" | "other";

function pageOf(pathname: string): Page {
  if (pathname.includes("inscription")) return "signup";
  if (pathname.includes("login")) return "login";
  return "other";
}

const NAV = {
  fr: {
    links: [
      { href: "/", label: "Accueil" },
      { href: "/login", label: "Connexion" },
      { href: "/inscription", label: "Créer un compte" },
      { href: "/mot-de-passe-oublie", label: "Mot de passe oublié" },
    ],
    support: "Assistance WhatsApp",
  },
  en: {
    links: [
      { href: "/en", label: "Home" },
      { href: "/en/login", label: "Sign in" },
      { href: "/en/inscription", label: "Create account" },
    ],
    support: "WhatsApp support",
  },
} as const;

/** Liens du haut de page (ordinateur) : le lien de la page en cours est en vert foncé. */
export function AuthNav({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? "";
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigation">
      {NAV[locale].links.map((l) => {
        const active = l.href === "/" || l.href === "/en" ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3.5 py-2 text-[15px] font-medium transition-colors ${
              active ? "bg-zindo-blue-800 text-white" : "text-zindo-ink-700 hover:bg-white/70 hover:text-zindo-blue-800"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Pastille d'assistance WhatsApp du haut de page (numéro réel de ZINDO). */
export function SupportPill({ locale }: { locale: Locale }) {
  return (
    <a
      href={SUPPORT_WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-sm font-semibold text-zindo-blue-800 ring-1 ring-zindo-blue-800/10 transition-colors hover:bg-white sm:px-4"
    >
      <MessageCircle className="h-4 w-4" />
      <span className="hidden sm:inline">
        {NAV[locale].support} ({SUPPORT_WHATSAPP_LABEL})
      </span>
    </a>
  );
}

const HERO = {
  fr: {
    login: {
      chip: "Espace commerçant sécurisé",
      title: "Accédez à votre caisse et à votre",
      accent: "stock.",
      sub: "Suivez vos ventes, vos stocks et vos bénéfices, avec ou sans connexion Internet.",
    },
    signup: {
      chip: "Essai gratuit, sans engagement",
      title: "Créez votre compte et vendez",
      accent: "dès aujourd'hui.",
      sub: "Caisse, stock, crédits clients et bénéfices dans une seule application, même quand Internet coupe.",
    },
    other: {
      chip: "Espace commerçant",
      title: "Votre commerce,",
      accent: "simplifié.",
      sub: "Caisse, stock, crédits clients et bénéfices dans une seule application, même quand Internet coupe.",
    },
    offline: ["Fonctionne même sans Internet", "Vos ventes sont gardées sur l'appareil, puis envoyées dès que la connexion revient."],
    figures: ["Stock, caisse et bénéfices", "Tout est calculé pour vous, boutique par boutique."],
    safe: ["Vos données sont protégées", "Mots de passe chiffrés et historique de chaque action."],
    nocard: "Aucune carte bancaire requise",
    help: "Besoin d'aide ?",
    founder: "Coulibaly Soma, fondateur de ZINDO",
  },
  en: {
    login: {
      chip: "Secure business area",
      title: "Access your checkout and your",
      accent: "stock.",
      sub: "Track your sales, stock and profits, with or without an internet connection.",
    },
    signup: {
      chip: "Free trial, no commitment",
      title: "Create your account and start selling",
      accent: "today.",
      sub: "Checkout, stock, customer credit and profits in one app, even when the internet goes down.",
    },
    other: {
      chip: "Business area",
      title: "Your business,",
      accent: "simplified.",
      sub: "Checkout, stock, customer credit and profits in one app, even when the internet goes down.",
    },
    offline: ["Works even without internet", "Your sales are kept on the device, then sent as soon as the connection is back."],
    figures: ["Stock, checkout and profits", "Everything is calculated for you, shop by shop."],
    safe: ["Your data is protected", "Encrypted passwords and a history of every action."],
    nocard: "No credit card required",
    help: "Need help?",
    founder: "Coulibaly Soma, founder of ZINDO",
  },
} as const;

function InfoCard({ icon: Icon, title, text }: { icon: typeof WifiOff; title: string; text: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/85 p-4 shadow-[0_10px_30px_-14px_rgba(0,56,32,0.3)]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zindo-blue-50 text-zindo-blue-700">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold text-zindo-blue-800">{title}</p>
        <p className="text-sm leading-snug text-zindo-ink-700">{text}</p>
      </div>
    </div>
  );
}

/** Colonne de gauche (ordinateur) : message selon la page, trois points forts réels, assistance. */
export function AuthHero({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? "";
  const page = pageOf(pathname);
  const t = HERO[locale];
  const h = t[page];
  return (
    <div className="hidden flex-col gap-6 lg:flex">
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-wide text-zindo-blue-800 ring-1 ring-zindo-blue-800/10">
        <span className="h-2 w-2 rounded-full bg-zindo-copper-400" />
        {h.chip}
      </span>
      <h1 className="font-(family-name:--font-syne) text-4xl font-bold leading-[1.12] tracking-tight text-zindo-blue-800 xl:text-5xl">
        {h.title} <span className="text-zindo-copper-700">{h.accent}</span>
      </h1>
      <p className="max-w-xl text-lg leading-relaxed text-zindo-ink-700">{h.sub}</p>

      <div className="flex max-w-xl flex-col gap-3">
        <InfoCard icon={WifiOff} title={t.offline[0]} text={t.offline[1]} />
        <InfoCard icon={BarChart3} title={t.figures[0]} text={t.figures[1]} />
        {page === "signup" ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white/85 px-4 py-3 text-[15px] font-medium text-zindo-blue-800 shadow-[0_10px_30px_-14px_rgba(0,56,32,0.3)]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zindo-blue-50 text-zindo-blue-700">
              <Check className="h-4 w-4" />
            </span>
            {t.nocard}
          </div>
        ) : (
          <InfoCard icon={ShieldCheck} title={t.safe[0]} text={t.safe[1]} />
        )}
        <a
          href={SUPPORT_WHATSAPP_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-2xl bg-zindo-blue-100 p-4 transition-colors hover:bg-zindo-blue-200/70"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-zindo-blue-800">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-zindo-blue-800">
              {t.help} {NAV[locale].support}
            </span>
            <span className="block text-sm text-zindo-ink-700">{SUPPORT_WHATSAPP_LABEL}</span>
          </span>
          <ChevronRight className="h-5 w-5 text-zindo-blue-800" />
        </a>
      </div>
    </div>
  );
}

/** Carte d'assistance affichée sous le formulaire sur téléphone. */
export function MobileSupport({ locale }: { locale: Locale }) {
  const t = HERO[locale];
  return (
    <a
      href={SUPPORT_WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-5 flex items-center gap-3 rounded-2xl bg-zindo-blue-100 p-3.5 lg:hidden"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-zindo-blue-800">
        <MessageCircle className="h-5 w-5" />
      </span>
      <span className="flex-1 text-sm">
        <span className="block font-semibold text-zindo-blue-800">
          {t.help} {NAV[locale].support}
        </span>
        <span className="block text-zindo-ink-700">{SUPPORT_WHATSAPP_LABEL}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-zindo-blue-800" />
    </a>
  );
}

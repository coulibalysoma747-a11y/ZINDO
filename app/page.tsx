import { getTrialDays } from "@/lib/platform-config";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import {
  Boxes,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  CreditCard,
  Store,
  MapPin,
  Users,
  ShieldCheck,
  Bot,
  UserPlus,
  ListChecks,
  PlayCircle,
  ArrowRight,
  CheckCircle2,
  Zap,
  Headphones,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isFeatureEnabledGlobally, registerFeatureFlag } from "@/lib/feature-flags";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { InstallAppButton } from "@/components/InstallAppButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { FacebookIcon } from "@/components/icons/FacebookIcon";
import { TikTokIcon } from "@/components/icons/TikTokIcon";
import { PublicHelpChat } from "@/components/PublicHelpChat";
import { HeroCarousel } from "@/components/landing/HeroCarousel";
import { DemoVideo } from "@/components/landing/DemoVideo";
import { WhatsAppFloat } from "@/components/landing/WhatsAppFloat";

// Cycle tricolore (vert/or/rouge, drapeau du Burkina Faso et logo ZINDO)
// appliqué aux puces d'icônes de la page publique pour une identité visuelle
// tricolore, sans jamais réutiliser ces teintes pour un état sémantique
// (danger/attention) ailleurs dans l'application.
const ICON_TONES = [
  { bg: "bg-zindo-green-50", text: "text-zindo-green-600" },
  { bg: "bg-zindo-gold-100", text: "text-zindo-gold-600" },
  { bg: "bg-zindo-red-50", text: "text-zindo-red-600" },
];
const ICON_TONES_DARK = [
  { bg: "bg-white/10", text: "text-zindo-green-400" },
  { bg: "bg-white/10", text: "text-zindo-gold-400" },
  { bg: "bg-white/10", text: "text-zindo-red-400" },
];

const CHANGES = [
  {
    icon: Boxes,
    title: "Un stock à jour en temps réel",
    text: "Chaque vente, achat ou transfert met votre stock à jour instantanément, boutique par boutique — fini les comptages approximatifs.",
  },
  {
    icon: TrendingUp,
    title: "Vos bénéfices enfin clairs",
    text: "Chiffre d'affaires, marge et bénéfices calculés automatiquement à chaque vente — plus besoin de tout recalculer à la main en fin de journée.",
  },
  {
    icon: AlertTriangle,
    title: "Zéro rupture surprise",
    text: "Une alerte dès qu'un produit atteint son stock minimum, avant que la rupture ne vous coûte une vente.",
  },
  {
    icon: ShoppingCart,
    title: "Une caisse qui va plus vite",
    text: "Encaissez en quelques secondes, imprimez un ticket ou une facture A4 détaillée avec signature et QR code de vérification.",
  },
  {
    icon: CreditCard,
    title: "Vos crédits sous contrôle",
    text: "Qui vous doit de l'argent, combien, depuis quand — suivi automatiquement, sans carnet à retrouver.",
  },
  {
    icon: MapPin,
    title: "Plusieurs boutiques, une seule vue",
    text: "Gérez boutiques et dépôts séparément, transférez du stock entre eux, tout depuis le même compte.",
  },
];

const REASONS = [
  {
    icon: Store,
    title: "Pensé pour les commerces d'ici",
    text: "FCFA natif, activités locales (quincaillerie, alimentation, pièces détachées, restauration...) : ZINDO adapte son interface au métier que vous choisissez.",
  },
  {
    icon: Users,
    title: "Vos équipes, vos règles",
    text: "Donnez à chaque employé exactement les droits dont il a besoin, module par module — un vendeur ne voit pas ce qui ne le regarde pas.",
  },
  {
    icon: Bot,
    title: "Un assistant qui vous conseille",
    text: "Un assistant intelligent intégré analyse vos ventes et répond à vos questions en langage naturel : « Quels sont mes produits les plus rentables ? »",
  },
  {
    icon: ShieldCheck,
    title: "Vos données protégées",
    text: "Rôles et permissions, historique de toutes les actions, confirmation avant toute suppression importante.",
  },
];

const FAQS = [
  {
    question: "Qu'est-ce que ZINDO ?",
    answer:
      "ZINDO est un logiciel de gestion de stock, de caisse et de facturation conçu au Burkina Faso, pour les boutiques comme pour les PME : quincailleries, magasins de pièces détachées, boutiques de motos, alimentations, grossistes et dépôts. Il remplace les cahiers et les fichiers Excel.",
  },
  {
    question: "ZINDO est-il adapté aux PME ?",
    answer:
      "Oui. En plus de la caisse et du stock, ZINDO gère plusieurs employés avec des permissions par module, plusieurs boutiques et dépôts, les achats fournisseurs, les crédits clients, les devis, les factures avec IFU et RCCM, les dépenses et les rapports de bénéfices.",
  },
  {
    question: "ZINDO fonctionne-t-il sur ordinateur ?",
    answer:
      "Oui. ZINDO fonctionne sur ordinateur Windows (application de bureau ou navigateur), sur téléphone et tablette Android et iOS, avec les mêmes données sur tous les appareils.",
  },
  {
    question: "ZINDO est-elle adaptée au FCFA et aux commerces du Burkina Faso ?",
    answer:
      "Oui. ZINDO fonctionne nativement en FCFA et s'adapte au pays et à l'activité choisis à l'inscription (boutique générale, quincaillerie, pièces détachées, boutique de motos, alimentation...) pour proposer les bons champs et les bons modules.",
  },
  {
    question: "Combien coûte ZINDO ?",
    answer:
      "ZINDO propose {trialDays} jours d'essai gratuit, sans engagement. Ensuite, l'abonnement coûte 7 500 FCFA par mois, ou 75 000 FCFA par an (soit 15 000 FCFA d'économie par rapport au paiement mensuel).",
  },
  {
    question: "Est-ce que je peux utiliser ZINDO sans connexion Internet ?",
    answer:
      "L'écran de caisse (Vente) fonctionne en mode hors ligne : vous pouvez continuer à encaisser sans connexion, les ventes se synchronisent automatiquement dès que la connexion revient.",
  },
  {
    question: "ZINDO peut-elle gérer la vente de motos et d'engins ?",
    answer:
      "Oui, avec un module dédié : suivi de chaque moto par numéro de châssis, numéro de moteur, couleur et disponibilité du CMC, ainsi que la vente à crédit avec échéancier de versements.",
  },
  {
    question: "Comment installer ZINDO sur mon téléphone ou mon ordinateur ?",
    answer:
      "ZINDO s'installe directement depuis le navigateur (bouton « Installer l'application », en haut de cette page) sur Android, iOS et Windows, sans passer par un store — c'est gratuit et ne prend que quelques secondes.",
  },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, title: "Sécurisé", text: "Vos données sont protégées" },
  { icon: Zap, title: "Rapide", text: "Gérez votre activité en quelques clics" },
  { icon: Headphones, title: "Support réactif", text: "Une équipe disponible pour vous accompagner" },
];

const SOCIAL_LINKS = [
  { icon: FacebookIcon, label: "Facebook", href: "https://www.facebook.com/profile.php?id=61594056733577&mibextid=ZbWKwL" },
  { icon: TikTokIcon, label: "TikTok", href: "https://www.tiktok.com/@zindo390?_r=1&_t=ZN-99o7lktR2Ws" },
];

const STEPS = [
  {
    icon: UserPlus,
    title: "Créez votre compte",
    text: "Renseignez votre commerce en quelques champs — aucune carte bancaire requise pour commencer.",
  },
  {
    icon: ListChecks,
    title: "Choisissez votre activité",
    text: "ZINDO adapte automatiquement votre tableau de bord, vos produits et votre caisse à votre métier.",
  },
  {
    icon: PlayCircle,
    title: "Vendez dès aujourd'hui",
    text: "Ajoutez vos produits et commencez à encaisser — votre stock et vos bénéfices se suivent tout seuls.",
  },
];

const STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ZINDO",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS, Windows",
    description:
      "Logiciel de gestion de stock, de caisse et de facturation conçu au Burkina Faso pour les boutiques et les PME : multi-utilisateurs, multi-dépôts, crédits clients, devis et factures, caisse hors ligne. Sur PC Windows, Android et iOS.",
    url: "https://www.zindo.site",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "XOF",
    },
    creator: {
      "@type": "Person",
      name: "Coulibaly Soma",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  },
];

export default async function RootPage() {
  const trialDays = await getTrialDays();
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  await registerFeatureFlag(
    "marche_zindo",
    "Place de marché ZINDO",
    "Page publique /marche qui rassemble les produits de toutes les boutiques en ligne publiées. À activer globalement."
  );
  const marketOpen = await isFeatureEnabledGlobally("marche_zindo");

  return (
    <div className="theme-locked relative overflow-x-hidden bg-zindo-cream">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replaceAll("{trialDays}", String(trialDays)) }} />
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-zindo-green-100/70 blur-3xl" />
        <div className="absolute top-1/3 -left-16 h-72 w-72 rounded-full bg-zindo-gold-100/60 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-zindo-red-100/40 blur-3xl" />
      </div>

      <div aria-hidden className="zindo-flag-stripe relative z-10 h-1 w-full" />

      {/* Barre supérieure — flex-wrap sur les deux niveaux : si le groupe
          d'actions ne tient pas à côté du logo sur un téléphone étroit, il
          passe sous le logo (voire se scinde lui-même) plutôt que de
          tronquer ou d'écraser un bouton sur plusieurs lignes illisibles. */}
      {/* z-30 (au-dessus de <main>/<footer>, tous deux z-10) : sans ça, le
          menu du sélecteur de langue — positionné en absolute sous ce bouton
          — se fait passer devant par le contenu qui suit dans le DOM, et les
          clics sur ses options n'atteignent jamais le bouton. */}
      <header className="relative z-30 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-y-2 px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <ZindoLogo size={40} />
          <span className="text-lg font-extrabold tracking-tight text-zindo-ink-900">ZINDO</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3">
          <LanguageSwitcher />
          <InstallAppButton
            iconOnly
            className="hidden items-center gap-1.5 rounded-xl border border-zinc-200 px-2.5 py-2 text-sm font-semibold text-zindo-ink-700 hover:border-zinc-300 sm:flex sm:px-3"
          />
          {marketOpen && (
            <Link
              href="/marche"
              className="whitespace-nowrap rounded-xl border border-zindo-green-500 px-2.5 py-2 text-sm font-bold text-zindo-green-700 hover:bg-zindo-green-100 sm:px-4"
            >
              Marché
            </Link>
          )}
          <Link
            href="/login"
            className="whitespace-nowrap rounded-xl px-2 py-2 text-sm font-semibold text-zindo-ink-700 hover:text-zindo-green-600 sm:px-4"
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

      {/* Hero */}
      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-24 pt-8 sm:px-8">
        <HeroCarousel>
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-block rounded-full bg-zindo-gold-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zindo-ink-900">
            Gestion de stock et de ventes
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Remplacez vos cahiers et vos fichiers Excel par{" "}
            <span className="text-zindo-green-400">ZINDO</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-200 sm:text-lg">
            Suivez votre stock en temps réel, encaissez vos ventes et connaissez enfin vos bénéfices —
            depuis une seule application conçue au Burkina Faso, pour les boutiques comme pour les PME.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/inscription"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zindo-green-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-zindo-green-500/30 transition hover:-translate-y-0.5 hover:bg-zindo-green-600 sm:w-auto"
            >
              Essai gratuit de {trialDays} jours <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-6 py-3.5 text-center text-base font-semibold text-zindo-ink-700 transition hover:border-zinc-300 sm:w-auto"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>
          <div className="mt-3 flex justify-center">
            <a
              href="/api/auth/google"
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-medium text-zindo-ink-700 transition hover:border-zinc-300 hover:bg-zinc-50 sm:w-auto"
            >
              <GoogleIcon className="h-[18px] w-[18px]" />
              Continuer avec Google
            </a>
          </div>
        </div>
        </HeroCarousel>

        {/* Visuel ZINDO — affiché en entier, sans texte par-dessus */}
        <section className="mt-10 overflow-hidden rounded-3xl shadow-xl">
          <Image
            src="/hero/zindo-hero.jpg"
            alt="Commerçant utilisant ZINDO : gestion de stock, ventes, tickets et rapports"
            width={1080}
            height={720}
            sizes="(min-width: 1152px) 1088px, 100vw"
            className="h-auto w-full"
          />
        </section>

        {/* Ce que ZINDO change */}
        <section className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
              Ce que ZINDO change pour votre commerce
            </h2>
            <p className="mt-2 text-zinc-500">
              Des problèmes concrets du quotidien, réglés une fois pour toutes.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CHANGES.map((item, i) => {
              const tone = ICON_TONES[i % ICON_TONES.length];
              return (
              <div
                key={item.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone.bg} ${tone.text}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold text-zindo-ink-900">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{item.text}</p>
              </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/fonctionnalites"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-zindo-green-700 hover:text-zindo-green-600"
            >
              Voir toutes les fonctionnalités <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Pourquoi travailler avec ZINDO */}
        <section className="mt-24 rounded-3xl bg-zindo-ink-900 px-6 py-14 sm:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Pourquoi travailler avec ZINDO
            </h2>
            <p className="mt-2 text-zindo-ink-200">Ce qui nous distingue d&apos;un simple tableur.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {REASONS.map((item, i) => {
              const tone = ICON_TONES_DARK[i % ICON_TONES_DARK.length];
              return (
              <div key={item.title} className="flex gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.bg} ${tone.text}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zindo-ink-200">{item.text}</p>
                </div>
              </div>
              );
            })}
          </div>
        </section>

        {/* Fondateur */}
        <section className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
              Le fondateur derrière ZINDO
            </h2>
          </div>
          <div className="mx-auto mt-10 flex max-w-3xl flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm sm:flex-row sm:items-center">
            <div className="relative h-64 w-full shrink-0 sm:h-auto sm:w-56 sm:self-stretch">
              <Image
                src="/brand/founder-coulibaly-soma.jpg"
                alt="Coulibaly Soma, fondateur de ZINDO"
                fill
                className="object-cover"
              />
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-wider text-zindo-green-600">Fondateur ZINDO</p>
              <h3 className="mt-1 text-xl font-extrabold text-zindo-ink-900">Coulibaly Soma</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                Développeur d&apos;une solution complète pour gérer votre activité en toute simplicité.
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-zindo-green-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> À vos côtés à chaque étape
              </p>
            </div>
          </div>

          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
            {TRUST_BADGES.map((badge) => (
              <div key={badge.title} className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zindo-green-50 text-zindo-green-600">
                  <badge.icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="font-bold text-zindo-ink-900">{badge.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{badge.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-6 flex max-w-3xl flex-col items-center justify-between gap-3 rounded-2xl bg-zindo-green-50 px-5 py-4 text-center sm:flex-row sm:text-left">
            <p className="text-sm text-zindo-green-800">
              Installable directement depuis votre navigateur, sur téléphone comme sur ordinateur — sans passer par
              un store.
            </p>
            <InstallAppButton className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-zindo-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-zindo-green-700" />
          </div>
        </section>

        {/* Assistant d'aide public */}
        <section className="mt-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
              Une question avant de vous inscrire ?
            </h2>
            <p className="mt-2 text-zinc-500">Notre assistant répond directement, pas besoin de créer un compte.</p>
          </div>
          <div className="mx-auto mt-8 max-w-2xl">
            <PublicHelpChat />
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
              Comment ça marche
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => {
              const tone = ICON_TONES[i % ICON_TONES.length];
              return (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md">
                  <step.icon className={`h-6 w-6 ${tone.text}`} />
                </div>
                <p className={`mt-4 text-xs font-bold uppercase tracking-wider ${tone.text}`}>
                  Étape {i + 1}
                </p>
                <h3 className="mt-1 font-bold text-zindo-ink-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{step.text}</p>
              </div>
              );
            })}
          </div>
        </section>

        {/* Questions fréquentes */}
        <section className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
              Questions fréquentes
            </h2>
          </div>
          <div className="mx-auto mt-10 max-w-2xl divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group px-5 py-4 open:bg-zindo-green-50/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-zindo-ink-900">
                  {faq.question}
                  <span className="shrink-0 text-zindo-green-600 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{faq.answer.replaceAll("{trialDays}", String(trialDays))}</p>
              </details>
            ))}
          </div>
        </section>

        <DemoVideo />

        {/* CTA final */}
        <section className="mt-24 rounded-3xl border border-zindo-green-100 bg-white px-6 py-14 text-center shadow-sm sm:px-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
            Prêt à changer la façon dont vous gérez votre commerce ?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-zinc-500">
            Créez votre compte en quelques minutes, sans engagement.
          </p>
          <Link
            href="/inscription"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zindo-green-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-zindo-green-500/30 transition hover:-translate-y-0.5 hover:bg-zindo-green-600"
          >
            Créer mon compte ZINDO <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <footer className="relative z-10 border-t border-zinc-200 py-8 text-center text-xs text-zinc-400">
        <p>ZINDO — Logiciel de gestion de stock, de caisse et de facturation conçu au Burkina Faso.</p>
        <p className="mt-1">
          <Link href="/fonctionnalites" className="hover:text-zindo-green-600">Fonctionnalités</Link>
          {" · "}
          <Link href="/fonctionnalites/logiciel-gestion-pme" className="hover:text-zindo-green-600">Pour les PME</Link>
          {" · "}
          <Link href="/fonctionnalites/credits-clients" className="hover:text-zindo-green-600">Crédits clients</Link>
          {" · "}
          <Link href="/fonctionnalites/facturation" className="hover:text-zindo-green-600">Factures et devis</Link>
          {" · "}
          <Link href="/tarifs" className="hover:text-zindo-green-600">Tarifs</Link>
        </p>
        <p className="mt-1">
          Support WhatsApp :{" "}
          <a
            href="https://wa.me/22604059929"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-500 hover:text-zindo-green-600"
          >
            +226 04 05 99 29
          </a>
        </p>
        <div className="mt-3 flex items-center justify-center gap-4">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="text-zinc-400 hover:text-zindo-green-600"
            >
              <social.icon className="h-5 w-5" />
            </a>
          ))}
        </div>
        <p className="mt-2">
          <Link href="/cgu" className="hover:text-zindo-green-600">
            Conditions générales d&apos;utilisation
          </Link>
          {" · "}
          <Link href="/confidentialite" className="hover:text-zindo-green-600">
            Politique de confidentialité
          </Link>
        </p>
      </footer>
      <WhatsAppFloat href="https://wa.me/22604059929" />
    </div>
  );
}

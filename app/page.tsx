import { redirect } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ZindoLogo } from "@/components/auth/ZindoLogo";

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

export default async function RootPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="theme-locked relative overflow-x-hidden bg-zindo-cream">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-zindo-orange-100/70 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-zindo-navy-50 blur-3xl" />
      </div>

      {/* Barre supérieure */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <ZindoLogo size={40} />
          <span className="text-lg font-extrabold tracking-tight text-zindo-navy-900">ZINDO</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-zindo-navy-700 hover:text-zindo-orange-600 sm:px-4"
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className="rounded-xl bg-zindo-orange-500 px-3 py-2 text-sm font-bold text-white shadow-md shadow-zindo-orange-500/25 transition hover:bg-zindo-orange-600 sm:px-5"
          >
            Créer un compte
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-24 pt-8 sm:px-8">
        <section className="mx-auto max-w-3xl text-center">
          <p className="inline-block rounded-full bg-zindo-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zindo-orange-700">
            Gestion de stock et de ventes
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-zindo-navy-900 sm:text-5xl">
            Remplacez vos cahiers et vos fichiers Excel par{" "}
            <span className="text-zindo-orange-600">ZINDO</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-600 sm:text-lg">
            Suivez votre stock en temps réel, encaissez vos ventes et connaissez enfin vos bénéfices —
            depuis une seule application pensée pour les commerces du Burkina Faso.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/inscription"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zindo-orange-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-zindo-orange-500/30 transition hover:-translate-y-0.5 hover:bg-zindo-orange-600 sm:w-auto"
            >
              Commencer gratuitement <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-6 py-3.5 text-center text-base font-semibold text-zindo-navy-700 transition hover:border-zinc-300 sm:w-auto"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>
        </section>

        {/* Ce que ZINDO change */}
        <section className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-zindo-navy-900 sm:text-3xl">
              Ce que ZINDO change pour votre commerce
            </h2>
            <p className="mt-2 text-zinc-500">
              Des problèmes concrets du quotidien, réglés une fois pour toutes.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CHANGES.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zindo-orange-50 text-zindo-orange-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold text-zindo-navy-900">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pourquoi travailler avec ZINDO */}
        <section className="mt-24 rounded-3xl bg-zindo-navy-900 px-6 py-14 sm:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Pourquoi travailler avec ZINDO
            </h2>
            <p className="mt-2 text-zindo-navy-200">Ce qui nous distingue d&apos;un simple tableur.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {REASONS.map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-zindo-orange-400">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zindo-navy-200">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-zindo-navy-900 sm:text-3xl">
              Comment ça marche
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md">
                  <step.icon className="h-6 w-6 text-zindo-orange-600" />
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-zindo-orange-600">
                  Étape {i + 1}
                </p>
                <h3 className="mt-1 font-bold text-zindo-navy-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="mt-24 rounded-3xl border border-zindo-orange-100 bg-white px-6 py-14 text-center shadow-sm sm:px-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-zindo-navy-900 sm:text-3xl">
            Prêt à changer la façon dont vous gérez votre commerce ?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-zinc-500">
            Créez votre compte en quelques minutes, sans engagement.
          </p>
          <Link
            href="/inscription"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zindo-orange-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-zindo-orange-500/30 transition hover:-translate-y-0.5 hover:bg-zindo-orange-600"
          >
            Créer mon compte ZINDO <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <footer className="relative z-10 border-t border-zinc-200 py-8 text-center text-xs text-zinc-400">
        <p>ZINDO — Gestion de stock et de ventes pour commerces du Burkina Faso.</p>
        <p className="mt-1">
          Support WhatsApp :{" "}
          <a
            href="https://wa.me/22604059929"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-500 hover:text-zindo-orange-600"
          >
            +226 04 05 99 29
          </a>
        </p>
        <p className="mt-1">
          Partenaire : <span className="font-medium text-zinc-500">Faso Stock</span> — Propriétaire Mohamed
          Sare
        </p>
      </footer>
    </div>
  );
}

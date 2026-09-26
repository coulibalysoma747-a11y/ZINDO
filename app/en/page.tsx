import { getTrialDays } from "@/lib/platform-config";
import type { Metadata } from "next";
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
import { InstallAppButton } from "@/components/InstallAppButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const metadata: Metadata = {
  title: "ZINDO — Stock, checkout and invoicing software for shops and SMEs in Burkina Faso",
  description:
    "ZINDO is the stock, checkout, and sales management software built in Burkina Faso for shops and SMEs: hardware stores, spare parts dealers, motorcycle shops, grocers. Track your stock in real time, get paid, and know your profits — in FCFA.",
  alternates: { canonical: "/en" },
};

// Même cycle tricolore que la page française (app/page.tsx) — voir ce
// fichier pour le commentaire complet sur l'usage réservé à l'identité
// visuelle publique.
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
    title: "Stock that's always up to date",
    text: "Every sale, purchase, or transfer updates your stock instantly, shop by shop — no more rough counts.",
  },
  {
    icon: TrendingUp,
    title: "Your profits, finally clear",
    text: "Revenue, margin, and profit calculated automatically with every sale — no more recalculating everything by hand at the end of the day.",
  },
  {
    icon: AlertTriangle,
    title: "Zero surprise stock-outs",
    text: "Get an alert as soon as a product hits its minimum stock, before a stock-out costs you a sale.",
  },
  {
    icon: ShoppingCart,
    title: "A faster checkout",
    text: "Get paid in seconds, print a receipt or a detailed A4 invoice with signature and a verification QR code.",
  },
  {
    icon: CreditCard,
    title: "Credit sales under control",
    text: "Who owes you money, how much, and since when — tracked automatically, no notebook to dig up.",
  },
  {
    icon: MapPin,
    title: "Several shops, one single view",
    text: "Manage shops and warehouses separately, transfer stock between them, all from the same account.",
  },
];

const REASONS = [
  {
    icon: Store,
    title: "Built for local businesses",
    text: "Native FCFA, local business types (hardware store, grocery, spare parts, restaurant...): ZINDO adapts its interface to the trade you choose.",
  },
  {
    icon: Users,
    title: "Your team, your rules",
    text: "Give each employee exactly the rights they need, module by module — a cashier doesn't see what isn't their concern.",
  },
  {
    icon: Bot,
    title: "An assistant that advises you",
    text: "A built-in smart assistant analyzes your sales and answers your questions in plain language: “What are my most profitable products?”",
  },
  {
    icon: ShieldCheck,
    title: "Your data, protected",
    text: "Roles and permissions, a history of every action, and confirmation before any important deletion.",
  },
];

const FAQS = [
  {
    question: "What is ZINDO?",
    answer:
      "ZINDO is stock, checkout, and sales management software built in Burkina Faso for shops and SMEs: hardware stores, spare parts dealers, motorcycle shops, grocers, and wholesalers. It replaces notebooks and spreadsheets.",
  },
  {
    question: "Is ZINDO built for FCFA and businesses in Burkina Faso?",
    answer:
      "Yes. ZINDO runs natively in FCFA and adapts to the country and business type you choose at sign-up (general store, hardware store, spare parts, motorcycle shop, grocery...) to show the right fields and modules.",
  },
  {
    question: "How much does ZINDO cost?",
    answer:
      "ZINDO offers a {trialDays}-day free trial, no commitment. Afterwards, the subscription costs 10,000 FCFA per month, or 100,000 FCFA per year (a 20,000 FCFA saving compared to paying monthly).",
  },
  {
    question: "Can I use ZINDO without an internet connection?",
    answer:
      "The checkout screen (Sales) works offline: you can keep taking payments without a connection, and sales sync automatically as soon as the connection comes back.",
  },
  {
    question: "Can ZINDO handle selling motorcycles and vehicles?",
    answer:
      "Yes, with a dedicated module: tracking each motorcycle by chassis number, engine number, color, and CMC availability, plus credit sales with an installment schedule.",
  },
  {
    question: "How do I install ZINDO on my phone or computer?",
    answer:
      "ZINDO installs straight from the browser (the “Install app” button at the top of this page) on Android, iOS, and Windows, without going through a store — it's free and takes only a few seconds.",
  },
];

const STEPS = [
  {
    icon: UserPlus,
    title: "Create your account",
    text: "Enter a few details about your business — no card required to get started.",
  },
  {
    icon: ListChecks,
    title: "Choose your business type",
    text: "ZINDO automatically adapts your dashboard, products, and checkout to your trade.",
  },
  {
    icon: PlayCircle,
    title: "Start selling today",
    text: "Add your products and start taking payments — your stock and profits track themselves.",
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
      "Stock, checkout, and sales management software built in Burkina Faso for shops and SMEs (hardware stores, spare parts, motorcycles, groceries).",
    url: "https://www.zindo.site/en",
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

export default async function EnglishRootPage() {
  const trialDays = await getTrialDays();
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

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

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <ZindoLogo size={40} />
          <span className="text-lg font-extrabold tracking-tight text-zindo-ink-900">ZINDO</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <InstallAppButton
            iconOnly
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-2.5 py-2 text-sm font-semibold text-zindo-ink-700 hover:border-zinc-300 sm:px-3"
          />
          <Link
            href="/en/login"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-zindo-ink-700 hover:text-zindo-green-600 sm:px-4"
          >
            Sign in
          </Link>
          <Link
            href="/en/inscription"
            className="rounded-xl bg-zindo-green-500 px-3 py-2 text-sm font-bold text-white shadow-md shadow-zindo-green-500/25 transition hover:bg-zindo-green-600 sm:px-5"
          >
            Create an account
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-24 pt-8 sm:px-8">
        <section className="mx-auto max-w-3xl text-center">
          <p className="inline-block rounded-full bg-zindo-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zindo-green-700">
            Stock and sales management
          </p>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-zindo-ink-900 sm:text-5xl">
            Replace your notebooks and spreadsheets with <span className="text-zindo-green-600">ZINDO</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-600 sm:text-lg">
            Track your stock in real time, take payments, and finally know your profits — from a single app built
            in Burkina Faso, for shops and SMEs alike.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/en/inscription"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-zindo-green-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-zindo-green-500/30 transition hover:-translate-y-0.5 hover:bg-zindo-green-600 sm:w-auto"
            >
              Start your {trialDays}-day free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/en/login"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-6 py-3.5 text-center text-base font-semibold text-zindo-ink-700 transition hover:border-zinc-300 sm:w-auto"
            >
              I already have an account
            </Link>
          </div>
        </section>

        <section className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
              What ZINDO changes for your business
            </h2>
            <p className="mt-2 text-zinc-500">Real everyday problems, solved for good.</p>
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
        </section>

        <section className="mt-24 rounded-3xl bg-zindo-ink-900 px-6 py-14 sm:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Why work with ZINDO</h2>
            <p className="mt-2 text-zindo-ink-200">What sets us apart from a simple spreadsheet.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {REASONS.map((item, i) => {
              const tone = ICON_TONES_DARK[i % ICON_TONES_DARK.length];
              return (
                <div key={item.title} className="flex gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.bg} ${tone.text}`}
                  >
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

        <section className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">How it works</h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => {
              const tone = ICON_TONES[i % ICON_TONES.length];
              return (
                <div key={step.title} className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md">
                    <step.icon className={`h-6 w-6 ${tone.text}`} />
                  </div>
                  <p className={`mt-4 text-xs font-bold uppercase tracking-wider ${tone.text}`}>Step {i + 1}</p>
                  <h3 className="mt-1 font-bold text-zindo-ink-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{step.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
              Frequently asked questions
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

        <section className="mt-24 rounded-3xl border border-zindo-green-100 bg-white px-6 py-14 text-center shadow-sm sm:px-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
            Ready to change the way you run your business?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-zinc-500">Create your account in a few minutes, no commitment.</p>
          <Link
            href="/en/inscription"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zindo-green-500 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-zindo-green-500/30 transition hover:-translate-y-0.5 hover:bg-zindo-green-600"
          >
            Create my ZINDO account <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>

      <footer className="relative z-10 border-t border-zinc-200 py-8 text-center text-xs text-zinc-400">
        <p>ZINDO — Stock and sales management built in Burkina Faso, for shops and SMEs alike.</p>
        <p className="mt-1">
          WhatsApp support:{" "}
          <a
            href="https://wa.me/22604059929"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-500 hover:text-zindo-green-600"
          >
            +226 04 05 99 29
          </a>
        </p>
        <p className="mt-2">
          <Link href="/en/cgu" className="hover:text-zindo-green-600">
            Terms of Service
          </Link>
          {" · "}
          <Link href="/en/confidentialite" className="hover:text-zindo-green-600">
            Privacy Policy
          </Link>
        </p>
      </footer>
    </div>
  );
}

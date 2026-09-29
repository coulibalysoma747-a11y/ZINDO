import Link from "next/link";
import Image from "next/image";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ArrowLeft, Package, ShoppingCart, Store, BarChart3 } from "lucide-react";
import { LiveDashboard } from "@/components/landing/AccueilProAnime";

const HIGHLIGHT_TONES = ["text-zindo-green-400", "text-zindo-gold-400", "text-zindo-red-400", "text-zindo-green-400"];
const HIGHLIGHT_TONES_LIGHT = ["text-zindo-green-600", "text-zindo-gold-600", "text-zindo-red-600", "text-zindo-green-600"];

const TEXT = {
  fr: {
    headline: (
      <>
        La gestion de votre commerce, <span className="text-zindo-green-400">simplifiée</span>.
      </>
    ),
    subhead:
      "Conçu au Burkina Faso pour les boutiques et les PME : suivez votre stock, vos ventes et vos bénéfices, chaque jour, même sans connexion.",
    createdBy: "Créé par Coulibaly Soma",
    founderName: "Coulibaly Soma",
    founderTagline: "Fondateur ZINDO — à vos côtés à chaque étape.",
    mobileTagline: (
      <>
        L&apos;application de gestion de{" "}
        <span className="font-semibold text-zindo-green-600">stock, caisse et ventes</span> pour les commerces du
        Burkina Faso
      </>
    ),
    discoverMore: "Découvrir ZINDO en détail →",
    homeHref: "/",
    highlights: [
      { icon: Package, short: "Stock en temps réel", text: "Stock en temps réel, sur toutes vos boutiques" },
      { icon: ShoppingCart, short: "Caisse rapide", text: "Caisse rapide avec tickets et factures A4" },
      { icon: Store, short: "Multi-boutiques", text: "Multi-boutiques et dépôts centralisés" },
      { icon: BarChart3, short: "Bénéfices calculés", text: "Bénéfices et rapports calculés automatiquement" },
    ],
  },
  en: {
    headline: (
      <>
        Running your business, <span className="text-zindo-green-400">simplified</span>.
      </>
    ),
    subhead:
      "Built in Burkina Faso for shops and small businesses: track your stock, sales and profits every day, even offline.",
    createdBy: "Created by Coulibaly Soma",
    founderName: "Coulibaly Soma",
    founderTagline: "ZINDO Founder — with you every step of the way.",
    mobileTagline: (
      <>
        The <span className="font-semibold text-zindo-green-600">stock, checkout, and sales</span> management app
        for businesses in Burkina Faso
      </>
    ),
    discoverMore: "Discover ZINDO in full →",
    homeHref: "/en",
    highlights: [
      { icon: Package, short: "Real-time stock", text: "Real-time stock, across all your shops" },
      { icon: ShoppingCart, short: "Fast checkout", text: "Fast checkout with receipts and A4 invoices" },
      { icon: Store, short: "Multi-shop", text: "Multiple shops and warehouses, centralized" },
      { icon: BarChart3, short: "Profits calculated", text: "Profits and reports calculated automatically" },
    ],
  },
} as const;

export function AuthShell({ children, locale = "fr", pro = false }: { children: React.ReactNode; locale?: "fr" | "en"; pro?: boolean }) {
  const t = TEXT[locale];
  if (pro) return <AuthShellPro locale={locale}>{children}</AuthShellPro>;

  return (
    <div className="theme-locked flex min-h-screen flex-col bg-zindo-cream">
      <div aria-hidden className="zindo-flag-stripe h-1 w-full shrink-0" />
      <div className="flex flex-1">
      <div className="relative hidden w-[42%] shrink-0 overflow-hidden bg-zindo-ink-900 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-zindo-green-500/20 blur-3xl" />
          <div className="absolute top-1/3 -right-10 h-64 w-64 rounded-full bg-zindo-gold-500/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-zindo-red-500/10 blur-3xl" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <ZindoLogo size={44} />
          <span className="text-xl font-extrabold tracking-tight text-white">ZINDO</span>
        </div>

        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">{t.headline}</h2>
          <p className="mt-3 max-w-sm text-[15px] text-slate-300">{t.subhead}</p>

          <ul className="mt-8 space-y-4">
            {t.highlights.map((h, i) => (
              <li key={h.text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <h.icon className={`h-4.5 w-4.5 ${HIGHLIGHT_TONES[i % HIGHLIGHT_TONES.length]}`} />
                </span>
                <span className="text-sm text-zindo-ink-50">{h.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <Image
              src="/brand/founder-coulibaly-soma.jpg"
              alt={t.founderName}
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white/20"
            />
            <div>
              <p className="text-sm font-semibold text-white">{t.founderName}</p>
              <p className="text-xs text-slate-300">{t.founderTagline}</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} ZINDO — {t.createdBy}
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col overflow-x-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-zindo-green-100/70 blur-3xl" />
          <div className="absolute top-1/3 -left-10 h-56 w-56 rounded-full bg-zindo-gold-100/50 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-zindo-red-100/40 blur-3xl" />
        </div>

        {/* z-30 (au-dessus de <main>, z-10) : voir app/page.tsx pour le pourquoi — sinon le menu du sélecteur de langue est intercepté par le contenu en dessous. */}
        <header className="relative z-30 flex justify-end px-5 pt-5 sm:px-6 sm:pt-6">
          <LanguageSwitcher />
        </header>

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-6">
          <div className="animate-zindo-fade-in-up w-full max-w-md lg:max-w-xl">
            <div className="mb-7 flex flex-col items-center text-center sm:mb-9 lg:hidden">
              <ZindoLogo size={60} />
              <h1 className="mt-4 text-[26px] font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
                ZINDO
              </h1>
              <p className="mt-1.5 text-[15px] text-zinc-500 sm:text-base">{t.mobileTagline}</p>
              <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {t.highlights.map((h, i) => (
                  <li
                    key={h.short}
                    className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zindo-ink-700 shadow-sm ring-1 ring-zinc-200"
                  >
                    <h.icon className={`h-3.5 w-3.5 ${HIGHLIGHT_TONES_LIGHT[i % HIGHLIGHT_TONES_LIGHT.length]}`} />
                    {h.short}
                  </li>
                ))}
              </ul>
              <Link
                href={t.homeHref}
                className="mt-3 text-xs font-semibold text-zindo-green-600 hover:text-zindo-green-700 hover:underline"
              >
                {t.discoverMore}
              </Link>
            </div>
            {children}
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}

const PRO_TEXT = {
  fr: {
    headline: "Votre stock et vos ventes,",
    accent: "justes chaque jour.",
    subhead: "Caisse, stock, crédits clients et bénéfices dans une seule application, même quand Internet coupe.",
    back: "Retour à l'accueil",
    founder: "Coulibaly Soma, fondateur de ZINDO",
  },
  en: {
    headline: "Your stock and sales,",
    accent: "right every day.",
    subhead: "Checkout, stock, customer credit and profits in one app, even when the internet goes down.",
    back: "Back to home",
    founder: "Coulibaly Soma, founder of ZINDO",
  },
} as const;

/** Connexion et inscription dans le style de la nouvelle page d'accueil (flag accueil_pro). */
function AuthShellPro({ children, locale }: { children: React.ReactNode; locale: "fr" | "en" }) {
  const t = PRO_TEXT[locale];
  const home = locale === "en" ? "/en" : "/";
  return (
    <div className="theme-locked flex min-h-screen bg-white">
      <aside className="relative isolate hidden w-[46%] shrink-0 flex-col justify-between overflow-hidden bg-zindo-green-950 p-12 text-white lg:flex xl:p-16">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-zindo-green-500/30 blur-[120px]" />
          <div className="absolute -bottom-32 -right-24 h-[380px] w-[380px] rounded-full bg-zindo-gold-500/15 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.07] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
            style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "44px 44px" }}
          />
        </div>
        <Link href={home} className="flex items-center gap-2.5">
          <ZindoLogo size={34} />
          <span className="text-lg font-bold tracking-tight">ZINDO</span>
        </Link>
        <div>
          <h2 className="text-4xl font-semibold leading-[1.1] tracking-[-0.03em] xl:text-[2.75rem]">
            {t.headline} <span className="text-zindo-green-300">{t.accent}</span>
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-zindo-green-100/75">{t.subhead}</p>
          <div className="mt-10 max-w-lg">
            <LiveDashboard phone={false} />
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-zindo-green-100/60">
          <Image src="/brand/founder-coulibaly-soma.jpg" alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover ring-2 ring-white/15" />
          <span>{t.founder}</span>
          <span className="ml-auto">© {new Date().getFullYear()} ZINDO</span>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col bg-zinc-50/60">
        <header className="relative z-30 flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6">
          <Link href={home} className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zindo-ink-900">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">{t.back}</span>
            <span className="flex items-center gap-2 sm:hidden">
              <ZindoLogo size={26} />
              <span className="font-bold text-zindo-ink-900">ZINDO</span>
            </span>
          </Link>
          <LanguageSwitcher />
        </header>
        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
          <div className="animate-zindo-fade-in-up w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}

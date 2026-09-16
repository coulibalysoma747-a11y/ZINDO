import Link from "next/link";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { LanguageSelector } from "@/components/auth/LanguageSelector";
import { Package, ShoppingCart, Store, BarChart3 } from "lucide-react";

const HIGHLIGHT_TONES = ["text-zindo-green-400", "text-zindo-gold-400", "text-zindo-red-400", "text-zindo-green-400"];
const HIGHLIGHT_TONES_LIGHT = ["text-zindo-green-600", "text-zindo-gold-600", "text-zindo-red-600", "text-zindo-green-600"];
const HIGHLIGHTS = [
  { icon: Package, short: "Stock en temps réel", text: "Stock en temps réel, sur toutes vos boutiques" },
  { icon: ShoppingCart, short: "Caisse rapide", text: "Caisse rapide avec tickets et factures A4" },
  { icon: Store, short: "Multi-boutiques", text: "Multi-boutiques et dépôts centralisés" },
  { icon: BarChart3, short: "Bénéfices calculés", text: "Bénéfices et rapports calculés automatiquement" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">
            La gestion de votre commerce,{" "}
            <span className="text-zindo-green-400">simplifiée</span>.
          </h2>
          <p className="mt-3 max-w-sm text-[15px] text-slate-300">
            Des milliers de commerçants au Burkina Faso utilisent ZINDO pour suivre leur stock, leurs ventes
            et leurs bénéfices, chaque jour.
          </p>

          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((h, i) => (
              <li key={h.text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <h.icon className={`h-4.5 w-4.5 ${HIGHLIGHT_TONES[i % HIGHLIGHT_TONES.length]}`} />
                </span>
                <span className="text-sm text-zindo-ink-50">{h.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} ZINDO — Créé par Coulibaly Soma
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
            En partenariat avec <span className="text-white">Faso Stock</span>
          </span>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col overflow-x-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-zindo-green-100/70 blur-3xl" />
          <div className="absolute top-1/3 -left-10 h-56 w-56 rounded-full bg-zindo-gold-100/50 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-zindo-red-100/40 blur-3xl" />
        </div>

        <header className="relative z-10 flex justify-end px-5 pt-5 sm:px-6 sm:pt-6">
          <LanguageSelector />
        </header>

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-6">
          <div className="animate-zindo-fade-in-up w-full max-w-md lg:max-w-xl">
            <div className="mb-7 flex flex-col items-center text-center sm:mb-9 lg:hidden">
              <ZindoLogo size={60} />
              <h1 className="mt-4 text-[26px] font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">
                ZINDO
              </h1>
              <p className="mt-1.5 text-[15px] text-zinc-500 sm:text-base">
                L&apos;application de gestion de{" "}
                <span className="font-semibold text-zindo-green-600">stock, caisse et ventes</span> pour les
                commerces du Burkina Faso
              </p>
              <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {HIGHLIGHTS.map((h, i) => (
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
                href="/"
                className="mt-3 text-xs font-semibold text-zindo-green-600 hover:text-zindo-green-700 hover:underline"
              >
                Découvrir ZINDO en détail →
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

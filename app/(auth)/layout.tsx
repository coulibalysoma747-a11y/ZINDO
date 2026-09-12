import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { LanguageSelector } from "@/components/auth/LanguageSelector";
import { Package, ShoppingCart, Store, BarChart3 } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Package, text: "Stock en temps réel, sur toutes vos boutiques" },
  { icon: ShoppingCart, text: "Caisse rapide avec tickets et factures A4" },
  { icon: Store, text: "Multi-boutiques et dépôts centralisés" },
  { icon: BarChart3, text: "Bénéfices et rapports calculés automatiquement" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-locked flex min-h-screen bg-zindo-cream">
      <div className="relative hidden w-[42%] shrink-0 overflow-hidden bg-zindo-navy-900 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-zindo-orange-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-zindo-navy-700/60 blur-3xl" />
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
            <span className="text-zindo-orange-400">simplifiée</span>.
          </h2>
          <p className="mt-3 max-w-sm text-[15px] text-slate-300">
            Des milliers de commerçants au Burkina Faso utilisent ZINDO pour suivre leur stock, leurs ventes
            et leurs bénéfices, chaque jour.
          </p>

          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <h.icon className="h-4.5 w-4.5 text-zindo-orange-400" />
                </span>
                <span className="text-sm text-zindo-navy-50">{h.text}</span>
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
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-zindo-orange-100/70 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-zindo-navy-50 blur-3xl" />
        </div>

        <header className="relative z-10 flex justify-end px-5 pt-5 sm:px-6 sm:pt-6">
          <LanguageSelector />
        </header>

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-6">
          <div className="animate-zindo-fade-in-up w-full max-w-md lg:max-w-xl">
            <div className="mb-7 flex flex-col items-center text-center sm:mb-9 lg:hidden">
              <ZindoLogo size={60} />
              <h1 className="mt-4 text-[26px] font-extrabold tracking-tight text-zindo-navy-900 sm:text-3xl">
                ZINDO
              </h1>
              <p className="mt-1.5 text-[15px] text-zinc-500 sm:text-base">
                Gérez votre <span className="font-semibold text-zindo-orange-600">commerce</span> simplement
              </p>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

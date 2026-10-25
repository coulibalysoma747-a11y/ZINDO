import Link from "next/link";
import { ZindoLogo } from "@/components/auth/ZindoLogo";

// Habillage commun des pages publiques de contenu (fonctionnalités) :
// même en-tête et pied de page que l'accueil, sans ses sections marketing.
export function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-locked min-h-screen bg-zindo-cream">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl">
        <div aria-hidden className="zindo-brand-stripe h-0.5 w-full" />
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-y-2 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <ZindoLogo size={34} className="!rounded-xl !shadow-none" />
            <span className="flex flex-col leading-none">
              <span className="text-[17px] font-extrabold tracking-[0.12em] text-zindo-ink-900">ZINDO</span>
              <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-zindo-blue-600">Gestion commerciale</span>
            </span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3">
            <Link
              href="/login"
              className="whitespace-nowrap rounded-xl px-2 py-2 text-sm font-semibold text-zindo-ink-700 hover:text-zindo-blue-700 sm:px-4"
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className="whitespace-nowrap rounded-xl bg-zindo-blue-700 px-2.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zindo-blue-800 sm:px-5"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-8 sm:px-8">{children}</main>

      <footer className="bg-zindo-ink-950 py-10 text-center text-xs text-white/45">
        <p>ZINDO — Logiciel de gestion de stock, de caisse et de facturation conçu au Burkina Faso.</p>
        <p className="mt-3">
          <Link href="/fonctionnalites" className="hover:text-white">Fonctionnalités</Link>
          {" · "}
          <Link href="/tarifs" className="hover:text-white">Tarifs</Link>
          {" · "}
          <Link href="/cgu" className="hover:text-white">CGU</Link>
          {" · "}
          <Link href="/confidentialite" className="hover:text-white">Confidentialité</Link>
        </p>
      </footer>
    </div>
  );
}

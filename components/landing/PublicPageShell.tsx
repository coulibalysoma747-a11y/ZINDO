import Link from "next/link";
import { ZindoLogo } from "@/components/auth/ZindoLogo";

// Habillage commun des pages publiques de contenu (fonctionnalités) :
// même en-tête et pied de page que l'accueil, sans ses sections marketing.
export function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-locked min-h-screen bg-zindo-cream">
      <div aria-hidden className="zindo-flag-stripe h-1 w-full" />

      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-y-2 px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <ZindoLogo size={40} />
          <span className="text-lg font-extrabold tracking-tight text-zindo-ink-900">ZINDO</span>
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-3">
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

      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-4 sm:px-8">{children}</main>

      <footer className="border-t border-zinc-200 py-8 text-center text-xs text-zinc-400">
        <p>ZINDO — Logiciel de gestion de stock, de caisse et de facturation conçu au Burkina Faso.</p>
        <p className="mt-2">
          <Link href="/fonctionnalites" className="hover:text-zindo-green-600">Fonctionnalités</Link>
          {" · "}
          <Link href="/tarifs" className="hover:text-zindo-green-600">Tarifs</Link>
          {" · "}
          <Link href="/cgu" className="hover:text-zindo-green-600">CGU</Link>
          {" · "}
          <Link href="/confidentialite" className="hover:text-zindo-green-600">Confidentialité</Link>
        </p>
      </footer>
    </div>
  );
}

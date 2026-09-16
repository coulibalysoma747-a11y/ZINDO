import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/** Habillage commun aux pages publiques légales (CGU, confidentialité) — reprend le style de app/page.tsx. */
export function LegalPage({
  title,
  updatedAt,
  updatedAtLabel = "Dernière mise à jour",
  homeHref = "/",
  homeLabel = "Accueil",
  children,
}: {
  title: string;
  updatedAt: string;
  updatedAtLabel?: string;
  homeHref?: string;
  homeLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="theme-locked relative min-h-screen overflow-x-hidden bg-zindo-cream">
      <div aria-hidden className="zindo-flag-stripe relative z-10 h-1 w-full" />

      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href={homeHref} className="flex items-center gap-3">
          <ZindoLogo size={36} />
          <span className="text-lg font-extrabold tracking-tight text-zindo-ink-900">ZINDO</span>
        </Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href={homeHref} className="flex items-center gap-1.5 text-sm font-semibold text-zindo-ink-700 hover:text-zindo-green-600">
            <ArrowLeft className="h-4 w-4" /> {homeLabel}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-3xl px-5 pb-24 sm:px-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{updatedAtLabel} : {updatedAt}</p>

        <div className="prose-legal mt-8 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm leading-relaxed text-zinc-700 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-zindo-ink-900">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SEO_PAGES } from "@/lib/seo-pages";
import { PublicPageShell } from "@/components/landing/PublicPageShell";

export const metadata: Metadata = {
  title: "Fonctionnalités — logiciel de gestion de stock, caisse et facturation",
  description:
    "Toutes les fonctionnalités de ZINDO : gestion de stock et inventaire, caisse hors ligne, factures et devis avec IFU, crédits clients, employés et permissions. Pour boutiques et PME au Burkina Faso.",
  alternates: { canonical: "https://www.zindo.site/fonctionnalites" },
};

export default function FonctionnalitesPage() {
  return (
    <PublicPageShell>
      <header className="max-w-3xl">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-zindo-ink-900 sm:text-4xl">
          Tout ce qu&apos;il faut pour gérer votre commerce
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">
          ZINDO est un logiciel de gestion de stock, de caisse et de facturation conçu au Burkina Faso, pour les
          boutiques comme pour les PME. Il fonctionne sur ordinateur, téléphone et tablette.
        </p>
      </header>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SEO_PAGES.map((p) => (
          <Link
            key={p.slug}
            href={`/fonctionnalites/${p.slug}`}
            className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zindo-green-500 hover:shadow-md"
          >
            <h2 className="font-bold text-zindo-ink-900">{p.label}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{p.metaDescription}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-zindo-green-700">
              En savoir plus <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </PublicPageShell>
  );
}

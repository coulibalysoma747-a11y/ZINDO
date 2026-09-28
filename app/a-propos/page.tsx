import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { isFeatureEnabledGlobally } from "@/lib/feature-flags";
import { PublicPageShell } from "@/components/landing/PublicPageShell";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "À propos de ZINDO",
  description: "ZINDO, logiciel de gestion de stock et de caisse conçu au Burkina Faso par Coulibaly Soma.",
  alternates: { canonical: "/a-propos" },
};

export default async function AProposPage() {
  if (!(await isFeatureEnabledGlobally("pied_page_complet"))) notFound();
  return (
    <PublicPageShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-4xl">À propos de ZINDO</h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600">
          ZINDO est né d&apos;un constat simple : beaucoup de commerces suivent encore leurs marchandises dans des
          cahiers ou des fichiers Excel. Les erreurs de stock, les ruptures et les crédits oubliés coûtent cher.
        </p>
        <p className="mt-4 leading-relaxed text-zinc-600">
          Conçu au Burkina Faso, ZINDO permet à une boutique comme à une PME de suivre son stock en temps réel,
          d&apos;encaisser ses ventes, de gérer ses clients et ses fournisseurs et de connaître ses bénéfices, en FCFA,
          sur téléphone comme sur ordinateur, même quand Internet coupe à la caisse.
        </p>

        <div className="mt-10 flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm sm:flex-row sm:items-center">
          <div className="relative h-64 w-full shrink-0 sm:h-auto sm:w-48 sm:self-stretch">
            <Image src="/brand/founder-coulibaly-soma.jpg" alt="Coulibaly Soma, fondateur de ZINDO" fill className="object-cover" />
          </div>
          <div className="p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-zindo-green-600">Fondateur</p>
            <h2 className="mt-1 text-xl font-extrabold text-zindo-ink-900">Coulibaly Soma</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              Créateur de ZINDO, il accompagne lui-même les commerçants, de l&apos;installation aux premières ventes.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/inscription" className="inline-flex items-center gap-2 rounded-2xl bg-zindo-green-500 px-6 py-3 font-bold text-white hover:bg-zindo-green-600">
            Essayer ZINDO <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/contact" className="rounded-2xl border border-zinc-200 bg-white px-6 py-3 font-semibold text-zindo-ink-700 hover:border-zinc-300">
            Nous contacter
          </Link>
        </div>
      </div>
    </PublicPageShell>
  );
}

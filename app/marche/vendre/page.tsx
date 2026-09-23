import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { isFeatureEnabledGlobally } from "@/lib/feature-flags";
import { ZindoLogo } from "@/components/auth/ZindoLogo";
import { SellerSignupForm } from "./SellerSignupForm";

export const metadata: Metadata = {
  title: "Vendre sur le Marché ZINDO — gratuit",
  description: "Pas de boutique ? Mettez vos produits en vente gratuitement sur le Marché ZINDO.",
};

export default async function SellOnMarketPage() {
  if (!(await isFeatureEnabledGlobally("marche_zindo"))) notFound();
  return (
    <div className="theme-locked min-h-screen bg-zinc-50">
      <header className="bg-zindo-ink-900 text-white">
        <div className="mx-auto flex max-w-xl items-center gap-2.5 px-4 py-4">
          <Link href="/marche" className="flex items-center gap-2.5">
            <ZindoLogo size={34} />
            <span className="text-lg font-extrabold">
              Marché <span className="text-zindo-green-400">ZINDO</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-2xl font-extrabold text-zindo-ink-900">Vendez vos produits sur le Marché ZINDO</h1>
        <p className="mt-2 text-sm text-zinc-600">Pas besoin d&apos;avoir une boutique. C&apos;est gratuit.</p>
        <ul className="mt-4 space-y-1.5 text-sm text-zinc-700">
          {["Publiez vos produits avec photo et prix", "Les acheteurs commandent depuis le marché", "Vous recevez les commandes et le client vous appelle"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-zindo-green-600" /> {t}
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-xl bg-zindo-gold-100 px-3 py-2 text-sm text-zindo-ink-900">
          ⭐ Envie d&apos;être <strong>à la une</strong> et affiché en premier ? Prenez l&apos;abonnement ZINDO : après vérification de votre compte par notre équipe, vous recevez le badge <strong>Vérifié</strong>.
        </p>
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <SellerSignupForm />
        </div>
      </main>
    </div>
  );
}

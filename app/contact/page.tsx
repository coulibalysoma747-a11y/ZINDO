import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageCircle, Phone, MapPin } from "lucide-react";
import { isFeatureEnabledGlobally } from "@/lib/feature-flags";
import { PublicPageShell } from "@/components/landing/PublicPageShell";
import { WHATSAPP_HREF } from "@/components/landing/PiedDePageComplet";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Contacter ZINDO",
  description: "Une question sur ZINDO ? Écrivez-nous sur WhatsApp au +226 04 05 99 29.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  if (!(await isFeatureEnabledGlobally("pied_page_complet"))) notFound();
  return (
    <PublicPageShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-zindo-ink-900 sm:text-4xl">Nous contacter</h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600">
          Une question avant de vous inscrire, besoin d&apos;aide pour démarrer ? Le plus rapide est WhatsApp.
        </p>

        <div className="mt-8 space-y-4">
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 hover:border-zindo-green-500"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366] text-white">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-bold text-zindo-ink-900">WhatsApp</span>
              <span className="text-sm text-zinc-500">+226 04 05 99 29 — réponse rapide</span>
            </span>
          </a>
          <a href="tel:+22604059929" className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5 hover:border-zindo-green-500">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zindo-green-50 text-zindo-green-600">
              <Phone className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-bold text-zindo-ink-900">Téléphone</span>
              <span className="text-sm text-zinc-500">+226 04 05 99 29</span>
            </span>
          </a>
          <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zindo-gold-100 text-zindo-gold-600">
              <MapPin className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-bold text-zindo-ink-900">Burkina Faso</span>
              <span className="text-sm text-zinc-500">Accompagnement à distance partout</span>
            </span>
          </div>
        </div>
      </div>
    </PublicPageShell>
  );
}

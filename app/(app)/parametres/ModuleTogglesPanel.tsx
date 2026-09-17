"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, Bell, Calculator, BellRing, PackagePlus, Images, FileSignature, Truck, Send } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import type { BusinessSettings } from "@/lib/business-settings";

type ModuleKey = keyof BusinessSettings["modulesEnabled"];

const MODULES: {
  key: ModuleKey;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  hrefLabel: string;
}[] = [
  {
    key: "notifications",
    icon: Bell,
    title: "Notifications",
    description: "Alertes automatiques : stock faible, rupture, inventaire à faire, crédit échu.",
    href: "/notifications",
    hrefLabel: "Ouvrir les notifications",
  },
  {
    key: "rappelsCredit",
    icon: BellRing,
    title: "Rappels crédit",
    description: "Relance WhatsApp en un clic pour chaque client qui doit encore de l'argent.",
    href: "/rappels-credit",
    hrefLabel: "Ouvrir les rappels crédit",
  },
  {
    key: "reassort",
    icon: PackagePlus,
    title: "Réassort",
    description: "Liste des produits sous leur seuil minimum, avec une quantité à recommander suggérée.",
    href: "/reassort",
    hrefLabel: "Ouvrir le réassort",
  },
  {
    key: "prixDeRevient",
    icon: Calculator,
    title: "Prix de revient",
    description: "Coût moyen réel (historique des achats) à comparer au prix d'achat renseigné.",
    href: "/prix-de-revient",
    hrefLabel: "Ouvrir le prix de revient",
  },
  {
    key: "photosProduits",
    icon: Images,
    title: "Photos produits",
    description: "Grille de tous les produits pour ajouter/remplacer une photo en un clic.",
    href: "/photos-produits",
    hrefLabel: "Ouvrir les photos produits",
  },
  {
    key: "quickSupply",
    icon: Truck,
    title: "Approvisionnement rapide",
    description: "Faire entrer de la marchandise en 30 secondes, sans fournisseur ni bon de commande.",
    href: "/approvisionnement",
    hrefLabel: "Ouvrir l'approvisionnement rapide",
  },
  {
    key: "pickups",
    icon: Send,
    title: "Enlèvements partenaires",
    description: "Un confrère prend de la marchandise chez vous, sans jamais entrer dans votre chiffre d'affaires.",
    href: "/enlevements",
    hrefLabel: "Ouvrir les enlèvements",
  },
  {
    key: "devis",
    icon: FileSignature,
    title: "Devis",
    description: "Devis avant facture, convertible en vente d'un bouton une fois accepté.",
    href: "/devis",
    hrefLabel: "Ouvrir les devis",
  },
];

export function ModuleTogglesPanel({ settings }: { settings: BusinessSettings }) {
  const [enabled, setEnabled] = useState(settings.modulesEnabled);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(key: ModuleKey, value: boolean) {
    const next = { ...enabled, [key]: value };
    setEnabled(next);
    setError(null);
    startTransition(async () => {
      const result = await updateBusinessSettingsAction({ modulesEnabled: { [key]: value } });
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        Masquez les modules que vous n&apos;utilisez pas — ils disparaissent du menu, sans rien supprimer de vos
        données.
      </p>
      {MODULES.map((m) => (
        <div key={m.key} className="rounded-xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <m.icon className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
              <div>
                <p className="font-medium text-zinc-900">{m.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{m.description}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={enabled[m.key]}
              disabled={pending}
              onChange={(e) => toggle(m.key, e.target.checked)}
              className="h-5 w-5 shrink-0 rounded accent-zindo-green-500"
            />
          </div>
          {enabled[m.key] && (
            <Link
              href={m.href}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-zindo-green-600 hover:underline"
            >
              {m.hrefLabel} <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

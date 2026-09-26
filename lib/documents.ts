import "server-only";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { getInvoiceCustomization } from "@/lib/invoice-customization";
import { formatDate, startOfMonth, startOfToday, startOfWeek, startOfYesterday } from "@/lib/format";
import type { DocBusiness } from "@/components/documents/A4Document";

/**
 * Documents PDF de gestion (A4, via « Imprimer / PDF ») : un flag par
 * document, tous désactivés par défaut, pour les ouvrir un à un.
 */
const DOCUMENT_FLAGS = {
  pdf_liste_debiteurs: {
    label: "PDF : liste des débiteurs",
    description: "Page Crédits : liste imprimable des clients qui doivent de l'argent (montant, depuis quand, téléphone), pour faire les relances.",
  },
  pdf_inventaire: {
    label: "PDF : feuille de comptage et rapport d'inventaire",
    description: "Inventaire : feuille de comptage à imprimer pour compter à la main dans le magasin, et rapport des écarts (en quantité et en valeur) d'un inventaire.",
  },
  pdf_rapport_activite: {
    label: "PDF : rapport d'activité",
    description: "Rapports : rapport A4 de la période (ventes, bénéfice par produit, achats par fournisseur, dépenses).",
  },
  pdf_etat_stock: {
    label: "PDF : état du stock",
    description: "Rapports et Stock : état du stock par catégorie (quantités, prix, valeur), avec ruptures et stocks faibles.",
  },
  pdf_releve_fournisseur: {
    label: "PDF : relevé fournisseur",
    description: "Fiche fournisseur : relevé A4 des achats, des paiements et de la dette restante.",
  },
  pdf_bon_reception: {
    label: "PDF : bon de réception",
    description: "Détail d'un achat : bon de réception A4 de la marchandise reçue, avec signatures.",
  },
  pdf_journal: {
    label: "PDF : journal des opérations",
    description: "Historique : journal imprimable des opérations de la période (ventes, achats, entrées, sorties, paiements).",
  },
  pdf_depenses: {
    label: "PDF : état des dépenses",
    description: "Dépenses : état des dépenses de la période, regroupées par catégorie.",
  },
} as const;

export type DocumentFlag = keyof typeof DOCUMENT_FLAGS;

export async function isDocumentEnabled(key: DocumentFlag, businessId: string): Promise<boolean> {
  await registerFeatureFlag(key, DOCUMENT_FLAGS[key].label, DOCUMENT_FLAGS[key].description);
  return isFeatureEnabled(key, businessId);
}

/** Commerce tel qu'il apparaît en en-tête des documents A4. */
export async function loadDocBusiness(businessId: string): Promise<DocBusiness | null> {
  const [{ data }, custom] = await Promise.all([
    supabase.from("businesses").select("name, logoUrl:logo_url, address, city, phone, currency").eq("id", businessId).maybeSingle(),
    getInvoiceCustomization(businessId),
  ]);
  if (!data) return null;
  return {
    ...(data as unknown as Omit<DocBusiness, "ifu" | "rccm" | "mobileMoneyInfo" | "signerName">),
    ifu: custom.ifu,
    rccm: custom.rccm,
    mobileMoneyInfo: custom.mobileMoneyInfo,
    signerName: custom.invoiceSignerName,
  };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type PeriodParams = { periode?: string; du?: string; au?: string };

export type Period = {
  from?: Date;
  /** Borne exclue. */
  to?: Date;
  label: string;
  /** Paramètres à reporter dans l'adresse du document (même période qu'à l'écran). */
  query: string;
};

/**
 * Période d'un document : les mêmes choix que les filtres des écrans
 * (?periode=aujourdhui|hier|semaine|mois), ou des dates précises (?du=&au=).
 */
export function resolvePeriod({ periode, du, au }: PeriodParams): Period {
  if ((du && DAY.test(du)) || (au && DAY.test(au))) {
    const from = du && DAY.test(du) ? new Date(du) : undefined;
    const last = au && DAY.test(au) ? new Date(au) : undefined;
    const to = last ? new Date(last.getTime() + 24 * 3600 * 1000) : undefined;
    const label =
      from && last
        ? `Du ${formatDate(from)} au ${formatDate(last)}`
        : from
          ? `Depuis le ${formatDate(from)}`
          : `Jusqu'au ${formatDate(last as Date)}`;
    const q = new URLSearchParams();
    if (from) q.set("du", du as string);
    if (last) q.set("au", au as string);
    return { from, to, label, query: q.toString() };
  }
  const now = new Date();
  switch (periode) {
    case "aujourdhui":
      return { from: startOfToday(), label: `Aujourd'hui, ${formatDate(now)}`, query: "periode=aujourdhui" };
    case "hier":
      return { from: startOfYesterday(), to: startOfToday(), label: `Hier, ${formatDate(startOfYesterday())}`, query: "periode=hier" };
    case "semaine":
      return { from: startOfWeek(), label: `Du ${formatDate(startOfWeek())} au ${formatDate(now)}`, query: "periode=semaine" };
    case "mois":
      return { from: startOfMonth(), label: `Du ${formatDate(startOfMonth())} au ${formatDate(now)}`, query: "periode=mois" };
    default:
      return { label: "Toute la période", query: "" };
  }
}

/** Ajoute la période (et d'autres paramètres) à l'adresse d'un document. */
export function withQuery(path: string, ...parts: (string | null | undefined)[]) {
  const q = parts.filter(Boolean).join("&");
  return q ? `${path}?${q}` : path;
}

export function printedByName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

"use server";

import { registerFeatureFlag, isFeatureEnabled } from "@/lib/feature-flags";

/**
 * Sélecteur de modèle de Facture A4 : nouvelle fonctionnalité, désactivée
 * par défaut tant qu'elle n'est pas explicitement activée depuis
 * /admin/fonctionnalites — voir la règle du memory "Feature rollout rule".
 * Ne concerne que le CHOIX du modèle ; la Facture A4 elle-même reste
 * disponible pour tout le monde (fonctionnalité déjà livrée, non gatée).
 */
const INVOICE_TEMPLATES_FLAG = "facture_multi_templates";

export async function ensureInvoiceTemplatesFlagRegistered() {
  await registerFeatureFlag(
    INVOICE_TEMPLATES_FLAG,
    "Modèles de facture",
    "Choisir parmi plusieurs styles visuels pour la Facture A4 (Classique, Moderne...) depuis les Paramètres."
  );
}

export async function isInvoiceTemplatesModuleEnabled(businessId: string) {
  return isFeatureEnabled(INVOICE_TEMPLATES_FLAG, businessId);
}

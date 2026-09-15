import "server-only";
import { supabase } from "@/lib/supabase";

export type InvoiceCustomization = {
  invoiceTagline: string | null;
  mobileMoneyInfo: string | null;
  invoiceSignerName: string | null;
  invoiceReturnPolicy: string | null;
};

const EMPTY: InvoiceCustomization = {
  invoiceTagline: null,
  mobileMoneyInfo: null,
  invoiceSignerName: null,
  invoiceReturnPolicy: null,
};

/**
 * Champs de personnalisation de la Facture A4 (voir /parametres), tenus à
 * l'écart du chargement principal de l'utilisateur (lib/auth.ts) qui
 * s'exécute à chaque requête : si la migration SQL de ces colonnes n'a pas
 * encore été appliquée sur la base, une erreur ici ne doit casser que
 * l'affichage de ces champs (repliés sur des valeurs vides), jamais la
 * connexion ou la navigation de tout le site.
 */
export async function getInvoiceCustomization(businessId: string): Promise<InvoiceCustomization> {
  try {
    const { data, error } = await supabase
      .from("businesses")
      .select("invoiceTagline:invoice_tagline, mobileMoneyInfo:mobile_money_info, invoiceSignerName:invoice_signer_name, invoiceReturnPolicy:invoice_return_policy")
      .eq("id", businessId)
      .maybeSingle();
    if (error || !data) return EMPTY;
    return data as unknown as InvoiceCustomization;
  } catch (e) {
    console.error("[getInvoiceCustomization] Échec de la lecture :", e);
    return EMPTY;
  }
}

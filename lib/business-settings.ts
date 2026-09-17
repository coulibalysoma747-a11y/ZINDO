import "server-only";
import { supabase } from "@/lib/supabase";

export type BusinessSettings = {
  /** "Toute vente au nom d'un client" — un client devient obligatoire sur chaque vente. */
  requireCustomerOnSale: boolean;
  /** "Refuser la vente si le client a une dette" — bloque l'encaissement tant que le solde n'est pas soldé. */
  blockSaleIfCustomerDebt: boolean;
};

// Comportement par défaut si la colonne n'est pas encore migrée ou vide :
// exactement le comportement actuel de ZINDO (aucune nouvelle contrainte).
const DEFAULTS: BusinessSettings = {
  requireCustomerOnSale: false,
  blockSaleIfCustomerDebt: false,
};

export async function getBusinessSettings(businessId: string): Promise<BusinessSettings> {
  const { data } = await supabase.from("businesses").select("settings").eq("id", businessId).maybeSingle();
  const raw = data?.settings as string | null | undefined;
  if (!raw) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export async function updateBusinessSettings(businessId: string, patch: Partial<BusinessSettings>) {
  const current = await getBusinessSettings(businessId);
  const next = { ...current, ...patch };
  const { error } = await supabase.from("businesses").update({ settings: JSON.stringify(next) }).eq("id", businessId);
  return { error, settings: next };
}

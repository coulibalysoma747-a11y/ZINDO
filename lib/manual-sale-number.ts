import "server-only";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { nextManualSaleNumber } from "@/lib/sale-number";

const MANUAL_SALE_NUMBER_FLAG = "numero_ticket_manuel";

export async function ensureManualSaleNumberFlagRegistered() {
  await registerFeatureFlag(
    MANUAL_SALE_NUMBER_FLAG,
    "N° de ticket manuel",
    "Champ facultatif « N° de ticket » à la caisse, pour continuer la numérotation d'un ancien logiciel (ex. S-1251 après FasoStock). Vide : numérotation ZINDO automatique."
  );
}

export async function isManualSaleNumberEnabled(businessId: string): Promise<boolean> {
  await ensureManualSaleNumberFlagRegistered();
  return isFeatureEnabled(MANUAL_SALE_NUMBER_FLAG, businessId);
}

/**
 * Numéro proposé à la caisse : le suivant du dernier numéro saisi à la main
 * (toute vente dont le numéro n'est pas une numérotation ZINDO "ZND-…").
 */
export async function getSuggestedManualSaleNumber(businessId: string): Promise<string | null> {
  const { data } = await supabase
    .from("sales")
    .select("number")
    .eq("business_id", businessId)
    .not("number", "like", "ZND-%")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.number ? nextManualSaleNumber(data.number as string) : null;
}

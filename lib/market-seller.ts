import { supabase } from "@/lib/supabase";
import { cache } from "react";

/**
 * Vendeurs du Marché ZINDO sans boutique (businesses.market_seller, posé par
 * lib/actions/market-seller.ts) : ils ne voient que l'espace vendeur, jamais
 * l'application complète d'un commerce avec boutique physique.
 */
export const MARKET_SELLER_HOME = "/vendeur";

// Seules pages de l'application accessibles à un vendeur du marché.
const ALLOWED_PREFIXES = [MARKET_SELLER_HOME, "/produits", "/boutique-en-ligne/commandes", "/verification", "/profil"];

export function isPathAllowedForMarketSeller(pathname: string): boolean {
  return ALLOWED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

async function isMarketSellerUncached(businessId: string): Promise<boolean> {
  const { data, error } = await supabase.from("businesses").select("market_seller").eq("id", businessId).maybeSingle();
  // Colonne absente (migration pas encore exécutée) : comportement normal.
  if (error || !data) return false;
  return data.market_seller === true;
}

/** Mémorisé le temps d'une requête : le layout et la page l'appellent tous les deux. */
export const isMarketSeller = cache(isMarketSellerUncached);

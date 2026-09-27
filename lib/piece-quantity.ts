import "server-only";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const PIECE_QUANTITY_FLAG = "quantite_en_pieces";

/**
 * Flag quantite_en_pieces : un conditionnement (« Paquet de 2 ») affiche sa
 * quantité en pièces (2, 4, 6…) dans le panier, le ticket et la facture, au
 * lieu de paquets (1, 2, 3…). Affichage seulement : la vente reste enregistrée
 * en paquets × multiplicateur (stock et prix inchangés).
 */
export async function isPieceQuantityEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    PIECE_QUANTITY_FLAG,
    "Conditionnements : quantité en pièces",
    "Panier, ticket et facture : « Paquet de 2 » affiche 2 (puis 4, 6…) au lieu de 1 paquet, avec le prix par pièce sur le ticket. Stock et totaux inchangés."
  );
  return isFeatureEnabled(PIECE_QUANTITY_FLAG, businessId);
}

/** Facteur d'affichage d'une ligne vendue (1 si pas de conditionnement ou flag éteint). */
export function pieceFactorOf(enabled: boolean, unitLabel: string | null, multiplier: number | null | undefined): number {
  const m = multiplier ?? 1;
  return enabled && unitLabel && m > 1 ? m : 1;
}

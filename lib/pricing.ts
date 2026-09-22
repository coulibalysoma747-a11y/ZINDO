// Calcul du prix unitaire applicable selon la quantité — tarification par
// palier ("prix de gros"), voir lib/actions/price-tiers.ts. Fichier neutre
// (ni "use server" ni "use client") pour être importable aussi bien depuis
// des Server Actions que depuis la caisse (POS.tsx, composant client).

export type PriceTierOption = {
  id: string;
  minQuantity: number;
  unitPrice: number;
};

/**
 * Retourne le prix unitaire du palier le plus avantageux atteint par `quantity`
 * (le palier avec la plus grande quantité minimale déjà atteinte), ou le prix
 * de base si aucun palier ne s'applique (quantité sous le premier seuil, ou
 * aucun palier défini pour ce produit).
 */
export function resolveTieredPrice(basePrice: number, quantity: number, tiers?: PriceTierOption[] | null): number {
  if (!tiers || tiers.length === 0) return basePrice;
  let price = basePrice;
  let bestMinQuantity = -1;
  for (const tier of tiers) {
    if (quantity >= tier.minQuantity && tier.minQuantity > bestMinQuantity) {
      price = tier.unitPrice;
      bestMinQuantity = tier.minQuantity;
    }
  }
  return price;
}

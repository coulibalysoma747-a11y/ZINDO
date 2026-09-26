// Calcul du total d'une vente (ou d'un devis) — une seule formule pour la
// caisse, la modification d'une vente, les ventes saisies par l'admin et les
// devis, couverte par lib/sale-totals.test.ts. Fichier neutre (ni "use server"
// ni "use client").

export type SaleLineAmounts = { unitPrice: number; quantity: number; discount: number };

export type SaleStatus = "PAYEE" | "PARTIELLE" | "CREDIT";

/** Montant d'une ligne : prix × quantité, moins la remise de la ligne. */
export function saleLineTotal(line: SaleLineAmounts): number {
  return line.unitPrice * line.quantity - line.discount;
}

/**
 * Sous-total (somme des lignes), total après remise globale (jamais négatif)
 * et montant reçu (jamais négatif).
 */
export function computeSaleTotals(lines: SaleLineAmounts[], globalDiscount: number, amountPaid: number) {
  const subtotal = lines.reduce((sum, line) => sum + saleLineTotal(line), 0);
  const total = Math.max(0, subtotal - globalDiscount);
  return { subtotal, total, amountPaid: Math.max(0, amountPaid) };
}

/** Payée si tout est reçu, partielle si une partie, crédit si rien. */
export function saleStatus(total: number, amountPaid: number): SaleStatus {
  return amountPaid >= total ? "PAYEE" : amountPaid > 0 ? "PARTIELLE" : "CREDIT";
}

/**
 * Argent réellement gardé par le commerce pour une vente : le montant reçu
 * (sales.amount_paid, conservé tel quel pour afficher la monnaie rendue sur
 * le ticket) sans la monnaie rendue au client. Sans ce plafond, un billet de
 * 1 000 pour un achat de 390 gonflait l'encaissé et les espèces attendues à
 * la clôture de 610. Un bon de retour (total négatif) garde son montant.
 */
export function cashedInAmount(total: number, amountPaid: number): number {
  if (total < 0) return amountPaid;
  return Math.max(0, Math.min(amountPaid, total));
}

/**
 * Même chose pour un paiement mixte : la monnaie est rendue en espèces, donc
 * retirée d'abord de la part espèces, puis de la part mobile money si besoin.
 */
export function cashedInMixedPortions(total: number, cashPortion: number, mobilePortion: number) {
  const excess = Math.max(0, cashPortion + mobilePortion - Math.max(0, total));
  const cash = Math.max(0, cashPortion - excess);
  const mobile = Math.max(0, mobilePortion - Math.max(0, excess - cashPortion));
  return { cash, mobile };
}

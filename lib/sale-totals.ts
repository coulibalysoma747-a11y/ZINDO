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

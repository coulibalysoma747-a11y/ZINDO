/** Libellés des moyens de paiement (enum payment_method), utilisables côté serveur comme dans le navigateur. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
  MIXTE: "Mixte",
};

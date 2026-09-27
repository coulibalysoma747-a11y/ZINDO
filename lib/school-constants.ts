/** Moyens de paiement de la scolarité — voir lib/actions/school.ts. */
export const SCHOOL_PAYMENT_METHODS = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile money",
  VIREMENT: "Virement / chèque",
  AUTRE: "Autre",
} as const;
export type SchoolPaymentMethod = keyof typeof SCHOOL_PAYMENT_METHODS;

// Statuts d'un dossier d'immatriculation d'engin — module neutre (pas de
// directive "use server") car lib/actions/vehicle-registrations.ts ne peut
// exporter que des fonctions async ; les composants client important ces
// constantes/types/fonction pure doivent donc venir chercher ici, pas
// dans le fichier d'actions.

export const REGISTRATION_STATUSES = [
  "EN_ATTENTE_PAIEMENT",
  "WW_A_EMETTRE",
  "WW_EMIS",
  "DEPOSE_MINISTERE",
  "RECEPISSE_RECU",
  "RECEPISSE_REMIS",
  "CARTE_GRISE_RECUE",
  "REMISE_AU_CLIENT",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  EN_ATTENTE_PAIEMENT: "En attente de paiement",
  WW_A_EMETTRE: "WW à émettre",
  WW_EMIS: "WW émis",
  DEPOSE_MINISTERE: "Déposé au ministère",
  RECEPISSE_RECU: "Récépissé reçu",
  RECEPISSE_REMIS: "Récépissé remis",
  CARTE_GRISE_RECUE: "Carte grise reçue",
  REMISE_AU_CLIENT: "Remise au client",
};

type StatusInputs = {
  grayCardHandedToClient: boolean;
  grayCardNumber: string | null;
  grayCardReceivedDate: string | null;
  receiptHandedToClient: boolean;
  receiptNumber: string | null;
  receiptReceivedDate: string | null;
  ministryDepositDate: string | null;
  ministryDepositReference: string | null;
  wwNumber: string | null;
  wwIssuedDate: string | null;
};

/** Statut recalculé à partir des champs saisis et du solde de la vente — jamais stocké, jamais désynchronisé. */
export function deriveRegistrationStatus(dossier: StatusInputs, remaining: number): RegistrationStatus {
  if (remaining > 0) return "EN_ATTENTE_PAIEMENT";
  if (dossier.grayCardHandedToClient) return "REMISE_AU_CLIENT";
  if (dossier.grayCardNumber || dossier.grayCardReceivedDate) return "CARTE_GRISE_RECUE";
  if (dossier.receiptHandedToClient) return "RECEPISSE_REMIS";
  if (dossier.receiptNumber || dossier.receiptReceivedDate) return "RECEPISSE_RECU";
  if (dossier.ministryDepositDate || dossier.ministryDepositReference) return "DEPOSE_MINISTERE";
  if (dossier.wwNumber || dossier.wwIssuedDate) return "WW_EMIS";
  return "WW_A_EMETTRE";
}

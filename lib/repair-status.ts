// Étiquettes et parcours normal du statut d'un bon de réparation — fichier
// neutre (ni "use server" ni "use client") : un module "use server" ne peut
// exporter que des fonctions async (voir lib/actions/repairs.ts), donc ces
// constantes, utilisées aussi côté client (RepairStatusActions.tsx), vivent
// ici plutôt que dans le fichier d'actions.
import type { RepairStatus } from "@/lib/db-types";

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  RECU: "Reçu",
  DIAGNOSTIC: "Diagnostic",
  EN_COURS: "En réparation",
  ATTENTE_PIECES: "Attente pièces",
  TERMINE: "Terminé",
  LIVRE: "Livré",
  ANNULE: "Annulé",
};

/** Ordre normal du parcours d'un bon (hors ANNULE, accessible depuis n'importe quel statut). */
export const REPAIR_STATUS_FLOW: RepairStatus[] = ["RECU", "DIAGNOSTIC", "EN_COURS", "ATTENTE_PIECES", "TERMINE", "LIVRE"];

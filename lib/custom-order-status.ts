// Étiquettes et parcours normal du statut d'une commande sur mesure —
// fichier neutre (ni "use server" ni "use client") : un module "use server"
// ne peut exporter que des fonctions async (voir lib/actions/custom-orders.ts),
// donc ces constantes, utilisées aussi côté client
// (CustomOrderStatusActions.tsx), vivent ici plutôt que dans le fichier
// d'actions.
import type { CustomOrderStatus } from "@/lib/db-types";

export const CUSTOM_ORDER_STATUS_LABELS: Record<CustomOrderStatus, string> = {
  EN_COURS: "En cours",
  PRET: "Prêt",
  LIVRE: "Livré",
  ANNULE: "Annulé",
};

export const CUSTOM_ORDER_STATUS_FLOW: CustomOrderStatus[] = ["EN_COURS", "PRET", "LIVRE"];

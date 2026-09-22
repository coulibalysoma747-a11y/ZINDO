// Étiquettes du statut d'un rendez-vous — fichier neutre (ni "use server" ni
// "use client") : un module "use server" ne peut exporter que des fonctions
// async (voir lib/actions/appointments.ts), donc cette constante, utilisée
// aussi côté client (AppointmentsAgenda.tsx), vit ici plutôt que dans le
// fichier d'actions.
import type { AppointmentStatus } from "@/lib/db-types";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  CONFIRME: "Confirmé",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
  ABSENT: "Absent",
};

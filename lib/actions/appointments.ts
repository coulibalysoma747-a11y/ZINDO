"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { APPOINTMENTS_FLAG, BEAUTY_ACTIVITY_KEY } from "@/lib/nav";
import type { AppointmentStatus } from "@/lib/db-types";

export { BEAUTY_ACTIVITY_KEY };

export type ActionState = { error?: string; success?: string } | undefined;

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  CONFIRME: "Confirmé",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
  ABSENT: "Absent",
};

/**
 * Rendez-vous : nouvelle fonctionnalité, désactivée par défaut tant qu'elle
 * n'est pas explicitement activée depuis /admin/fonctionnalites — voir la
 * règle du memory "Feature rollout rule".
 */
export async function ensureAppointmentsFlagRegistered() {
  await registerFeatureFlag(
    APPOINTMENTS_FLAG,
    "Rendez-vous",
    "Agenda des rendez-vous (coupe, coloration, soin...) par membre du personnel, pour éviter les doubles réservations — pour salons de cosmétique/beauté. L'encaissement de la prestation se fait normalement, depuis l'écran de vente."
  );
}

export async function isAppointmentsModuleEnabled(businessId: string): Promise<boolean> {
  await ensureAppointmentsFlagRegistered();
  return isFeatureEnabled(APPOINTMENTS_FLAG, businessId);
}

// --- Services -----------------------------------------------------------

export type ServiceRow = { id: string; name: string; durationMinutes: number; price: number; active: boolean };

export async function getServicesAction(): Promise<ServiceRow[]> {
  const user = await requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE);
  const { data } = await supabase
    .from("services")
    .select("id, name, durationMinutes:duration_minutes, price, active")
    .eq("business_id", user.businessId)
    .order("name", { ascending: true });
  return (data ?? []) as unknown as ServiceRow[];
}

const serviceSchema = z.object({
  name: z.string().min(1, "Le nom de la prestation est requis"),
  durationMinutes: z.coerce.number().int().positive("Durée invalide"),
  price: z.coerce.number().min(0, "Prix invalide"),
});

export async function createServiceAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE);
  const parsed = serviceSchema.safeParse({ name: formData.get("name"), durationMinutes: formData.get("durationMinutes"), price: formData.get("price") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: existing } = await supabase.from("services").select("id").eq("business_id", user.businessId).eq("name", parsed.data.name).maybeSingle();
  if (existing) return { error: "Une prestation porte déjà ce nom" };

  const { error } = await supabase.from("services").insert({
    business_id: user.businessId,
    name: parsed.data.name,
    duration_minutes: parsed.data.durationMinutes,
    price: parsed.data.price,
  });
  if (error) {
    console.error("[createServiceAction] Échec de la création :", error.message);
    return { error: "Impossible de créer la prestation" };
  }

  revalidatePath("/rendez-vous/services");
  return { success: "Prestation ajoutée" };
}

export async function toggleServiceActiveAction(id: string, active: boolean): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE);
  const { data: service } = await supabase.from("services").select("id").eq("id", id).eq("business_id", user.businessId).maybeSingle();
  if (!service) return { error: "Prestation introuvable" };

  const { error } = await supabase.from("services").update({ active }).eq("id", id);
  if (error) {
    console.error("[toggleServiceActiveAction] Échec :", error.message);
    return { error: "Impossible de mettre à jour la prestation" };
  }

  revalidatePath("/rendez-vous/services");
  return { success: active ? "Prestation réactivée" : "Prestation désactivée" };
}

export async function deleteServiceAction(id: string): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE);
  const { data: service } = await supabase.from("services").select("id").eq("id", id).eq("business_id", user.businessId).maybeSingle();
  if (!service) return { error: "Prestation introuvable" };

  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) {
    console.error("[deleteServiceAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer la prestation" };
  }

  revalidatePath("/rendez-vous/services");
  return { success: "Prestation supprimée" };
}

// --- Rendez-vous ----------------------------------------------------------

export type AppointmentRow = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  price: number;
  status: AppointmentStatus;
  note: string | null;
  customer: { id: string; name: string } | null;
  customerName: string | null;
  customerPhone: string | null;
  service: { id: string; name: string } | null;
  staff: { id: string; firstName: string; lastName: string } | null;
};

const APPOINTMENT_FIELDS =
  "id, scheduledAt:scheduled_at, durationMinutes:duration_minutes, price, status, note, customer:customers(id, name), customerName:customer_name, customerPhone:customer_phone, service:services(id, name), staff:users(id, firstName:first_name, lastName:last_name)";

export async function getAppointmentsAction(dateFrom: string, dateTo: string): Promise<AppointmentRow[]> {
  const user = await requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE);
  const { data } = await supabase
    .from("appointments")
    .select(APPOINTMENT_FIELDS)
    .eq("business_id", user.businessId)
    .gte("scheduled_at", dateFrom)
    .lt("scheduled_at", dateTo)
    .order("scheduled_at", { ascending: true });
  return (data ?? []) as unknown as AppointmentRow[];
}

const createSchema = z.object({
  locationId: z.string().min(1, "Choisissez une boutique"),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  serviceId: z.string().min(1, "Choisissez une prestation"),
  staffId: z.string().optional(),
  scheduledAt: z.string().min(1, "La date et l'heure sont requises"),
  durationMinutes: z.coerce.number().int().positive("Durée invalide"),
  price: z.coerce.number().min(0, "Prix invalide"),
  note: z.string().optional(),
});

export async function createAppointmentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE);
  if (!(await isAppointmentsModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = createSchema.safeParse({
    locationId: formData.get("locationId"),
    customerId: formData.get("customerId") || undefined,
    customerName: formData.get("customerName") || undefined,
    customerPhone: formData.get("customerPhone") || undefined,
    serviceId: formData.get("serviceId"),
    staffId: formData.get("staffId") || undefined,
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    price: formData.get("price"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  if (!data.customerId && !data.customerName) return { error: "Indiquez un client existant ou au moins un nom" };

  const { data: location } = await supabase.from("locations").select("id").eq("id", data.locationId).eq("business_id", user.businessId).maybeSingle();
  if (!location) return { error: "Boutique introuvable" };

  const scheduledAtIso = new Date(data.scheduledAt).toISOString();

  if (data.staffId) {
    const startMs = new Date(scheduledAtIso).getTime();
    const endMs = startMs + data.durationMinutes * 60_000;
    const { data: sameDay } = await supabase
      .from("appointments")
      .select("scheduledAt:scheduled_at, durationMinutes:duration_minutes")
      .eq("business_id", user.businessId)
      .eq("staff_id", data.staffId)
      .neq("status", "ANNULE")
      .gte("scheduled_at", new Date(startMs - 4 * 60 * 60_000).toISOString())
      .lte("scheduled_at", new Date(endMs + 4 * 60 * 60_000).toISOString());
    const overlap = ((sameDay ?? []) as unknown as Array<{ scheduledAt: string; durationMinutes: number }>).some((a) => {
      const aStart = new Date(a.scheduledAt).getTime();
      const aEnd = aStart + a.durationMinutes * 60_000;
      return startMs < aEnd && endMs > aStart;
    });
    if (overlap) return { error: "Ce membre du personnel a déjà un rendez-vous sur ce créneau" };
  }

  const { error } = await supabase.from("appointments").insert({
    business_id: user.businessId,
    location_id: data.locationId,
    customer_id: data.customerId || null,
    customer_name: data.customerId ? null : data.customerName || null,
    customer_phone: data.customerId ? null : data.customerPhone || null,
    service_id: data.serviceId,
    staff_id: data.staffId || null,
    scheduled_at: scheduledAtIso,
    duration_minutes: data.durationMinutes,
    price: data.price,
    note: data.note ?? null,
    user_id: user.id,
  });
  if (error) {
    console.error("[createAppointmentAction] Échec de la création :", error.message);
    return { error: "Impossible de créer le rendez-vous" };
  }

  revalidatePath("/rendez-vous");
  return { success: "Rendez-vous créé" };
}

export async function updateAppointmentStatusAction(id: string, status: AppointmentStatus): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE);
  const { data: appointment } = await supabase.from("appointments").select("id").eq("id", id).eq("business_id", user.businessId).maybeSingle();
  if (!appointment) return { error: "Rendez-vous introuvable" };

  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) {
    console.error("[updateAppointmentStatusAction] Échec :", error.message);
    return { error: "Impossible de mettre à jour le statut" };
  }

  revalidatePath("/rendez-vous");
  return { success: `Statut : ${APPOINTMENT_STATUS_LABELS[status]}` };
}

export async function deleteAppointmentAction(id: string): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE);
  const { data: appointment } = await supabase.from("appointments").select("id").eq("id", id).eq("business_id", user.businessId).maybeSingle();
  if (!appointment) return { error: "Rendez-vous introuvable" };

  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) {
    console.error("[deleteAppointmentAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer le rendez-vous" };
  }

  revalidatePath("/rendez-vous");
  return { success: "Rendez-vous supprimé" };
}

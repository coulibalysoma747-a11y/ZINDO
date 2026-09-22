"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { adjustStock } from "@/lib/stock";
import { generateRepairNumber } from "@/lib/reference";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { REPAIR_FLAG } from "@/lib/nav";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";
import { REPAIR_STATUS_LABELS } from "@/lib/repair-status";
import type { RepairStatus, PaymentMethod } from "@/lib/db-types";

/**
 * Bons de réparation : nouvelle fonctionnalité, désactivée par défaut tant
 * qu'elle n'est pas explicitement activée depuis /admin/fonctionnalites —
 * voir la règle du memory "Feature rollout rule".
 */
export async function ensureRepairFlagRegistered() {
  await registerFeatureFlag(
    REPAIR_FLAG,
    "Bons de réparation",
    "Suivi d'un appareil/engin pris en charge (panne, diagnostic, pièces utilisées, main-d'œuvre) jusqu'à sa restitution au client — pour ateliers de réparation et vendeurs de pièces détachées."
  );
}

export async function isRepairModuleEnabled(businessId: string): Promise<boolean> {
  await ensureRepairFlagRegistered();
  return isFeatureEnabled(REPAIR_FLAG, businessId);
}

export type RepairTicketItemRow = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type RepairTicketListItem = {
  id: string;
  number: string;
  deviceType: string;
  reportedIssue: string;
  status: RepairStatus;
  createdAt: string;
  customer: { id: string; name: string; phone: string | null } | null;
  total: number;
  amountPaid: number;
};

export type RepairTicketDetail = RepairTicketListItem & {
  deviceDescription: string | null;
  diagnosis: string | null;
  laborCost: number;
  discount: number;
  paymentMethod: PaymentMethod | null;
  note: string | null;
  startedAt: string | null;
  completedAt: string | null;
  deliveredAt: string | null;
  technician: { id: string; firstName: string; lastName: string } | null;
  locationId: string;
  items: RepairTicketItemRow[];
};

const TICKET_FIELDS =
  "id, number, deviceType:device_type, deviceDescription:device_description, reportedIssue:reported_issue, diagnosis, status, createdAt:created_at, startedAt:started_at, completedAt:completed_at, deliveredAt:delivered_at, laborCost:labor_cost, discount, amountPaid:amount_paid, paymentMethod:payment_method, note, locationId:location_id, customer:customers(id, name, phone), technician:users(id, firstName:first_name, lastName:last_name)";

async function fetchItemsByTicket(ticketIds: string[]): Promise<Map<string, RepairTicketItemRow[]>> {
  const map = new Map<string, RepairTicketItemRow[]>();
  if (ticketIds.length === 0) return map;
  const { data } = await supabase
    .from("repair_ticket_items")
    .select("id, repairTicketId:repair_ticket_id, productId:product_id, quantity, unitPrice:unit_price, total, product:products(name)")
    .in("repair_ticket_id", ticketIds);
  for (const row of (data ?? []) as unknown as Array<{
    id: string;
    repairTicketId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    product: { name: string } | null;
  }>) {
    const list = map.get(row.repairTicketId) ?? [];
    list.push({ id: row.id, productId: row.productId, productName: row.product?.name ?? "—", quantity: row.quantity, unitPrice: row.unitPrice, total: row.total });
    map.set(row.repairTicketId, list);
  }
  return map;
}

function computeTotal(laborCost: number, discount: number, items: RepairTicketItemRow[]): number {
  return Math.max(0, laborCost - discount + items.reduce((s, i) => s + i.total, 0));
}

export async function getRepairTicketsAction(filters?: { status?: RepairStatus }): Promise<RepairTicketListItem[]> {
  const user = await requirePermission(PERMISSIONS.REPAIRS_MANAGE);

  let q = supabase.from("repair_tickets").select(TICKET_FIELDS).eq("business_id", user.businessId).order("created_at", { ascending: false });
  if (filters?.status) q = q.eq("status", filters.status);
  const { data } = await q;
  const tickets = (data ?? []) as unknown as Array<Omit<RepairTicketDetail, "items" | "total">>;
  const itemsByTicket = await fetchItemsByTicket(tickets.map((t) => t.id));

  return tickets.map((t) => {
    const items = itemsByTicket.get(t.id) ?? [];
    return {
      id: t.id,
      number: t.number,
      deviceType: t.deviceType,
      reportedIssue: t.reportedIssue,
      status: t.status,
      createdAt: t.createdAt,
      customer: t.customer,
      total: computeTotal(t.laborCost, t.discount, items),
      amountPaid: t.amountPaid,
    };
  });
}

export async function getRepairTicketAction(id: string): Promise<RepairTicketDetail | null> {
  const user = await requirePermission(PERMISSIONS.REPAIRS_MANAGE);

  const { data } = await supabase.from("repair_tickets").select(TICKET_FIELDS).eq("id", id).eq("business_id", user.businessId).maybeSingle();
  if (!data) return null;
  const ticket = data as unknown as Omit<RepairTicketDetail, "items" | "total">;
  const items = (await fetchItemsByTicket([id])).get(id) ?? [];

  return { ...ticket, items, total: computeTotal(ticket.laborCost, ticket.discount, items) };
}

export type ActionState = { error?: string; success?: string } | undefined;

const createSchema = z.object({
  locationId: z.string().min(1, "Choisissez une boutique"),
  customerId: z.string().optional(),
  deviceType: z.string().min(1, "Le type d'appareil/engin est requis"),
  deviceDescription: z.string().optional(),
  reportedIssue: z.string().min(1, "Décrivez la panne signalée par le client"),
  technicianId: z.string().optional(),
  note: z.string().optional(),
});

export async function createRepairTicketAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.REPAIRS_MANAGE);
  if (!(await isRepairModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = createSchema.safeParse({
    locationId: formData.get("locationId"),
    customerId: formData.get("customerId") || undefined,
    deviceType: formData.get("deviceType"),
    deviceDescription: formData.get("deviceDescription") || undefined,
    reportedIssue: formData.get("reportedIssue"),
    technicianId: formData.get("technicianId") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const { data: location } = await supabase.from("locations").select("id").eq("id", data.locationId).eq("business_id", user.businessId).maybeSingle();
  if (!location) return { error: "Boutique introuvable" };

  const number = await generateRepairNumber(user.businessId);
  const { data: ticket, error } = await supabase
    .from("repair_tickets")
    .insert({
      business_id: user.businessId,
      location_id: data.locationId,
      number,
      customer_id: data.customerId || null,
      device_type: data.deviceType,
      device_description: data.deviceDescription ?? null,
      reported_issue: data.reportedIssue,
      technician_id: data.technicianId || null,
      note: data.note ?? null,
      user_id: user.id,
    })
    .select("id")
    .single();
  if (error || !ticket) {
    console.error("[createRepairTicketAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer le bon de réparation" };
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "CREATE", entity: "RepairTicket", entityId: ticket.id as string, details: number });

  revalidatePath("/reparations");
  redirect(`/reparations/${ticket.id}`);
}

const STATUS_TIMESTAMP_FIELD: Partial<Record<RepairStatus, "started_at" | "completed_at" | "delivered_at">> = {
  EN_COURS: "started_at",
  TERMINE: "completed_at",
  LIVRE: "delivered_at",
};

export async function updateRepairStatusAction(ticketId: string, status: RepairStatus): Promise<ActionState> {
  try {
    const user = await requirePermission(PERMISSIONS.REPAIRS_MANAGE);
    if (!(await isRepairModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

    const { data: ticket } = await supabase.from("repair_tickets").select("id, status").eq("id", ticketId).eq("business_id", user.businessId).maybeSingle();
    if (!ticket) return { error: "Bon de réparation introuvable" };
    if (ticket.status === "LIVRE" || ticket.status === "ANNULE") return { error: "Ce bon est déjà clôturé" };

    const timestampField = STATUS_TIMESTAMP_FIELD[status];
    const update: Record<string, unknown> = { status };
    if (timestampField) update[timestampField] = new Date().toISOString();

    const { error } = await supabase.from("repair_tickets").update(update).eq("id", ticketId);
    if (error) {
      console.error("[updateRepairStatusAction] Échec :", error.message);
      return { error: "Impossible de mettre à jour le statut" };
    }

    revalidatePath("/reparations");
    revalidatePath(`/reparations/${ticketId}`);
    return { success: `Statut : ${REPAIR_STATUS_LABELS[status]}` };
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[updateRepairStatusAction] Erreur inattendue :", e);
    return { error: "Une erreur inattendue est survenue" };
  }
}

const detailsSchema = z.object({
  diagnosis: z.string().optional(),
  laborCost: z.coerce.number().min(0, "Montant invalide"),
  discount: z.coerce.number().min(0, "Remise invalide"),
  technicianId: z.string().optional(),
});

export async function updateRepairDetailsAction(ticketId: string, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.REPAIRS_MANAGE);
  if (!(await isRepairModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = detailsSchema.safeParse({
    diagnosis: formData.get("diagnosis") || undefined,
    laborCost: formData.get("laborCost") || 0,
    discount: formData.get("discount") || 0,
    technicianId: formData.get("technicianId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: ticket } = await supabase.from("repair_tickets").select("id").eq("id", ticketId).eq("business_id", user.businessId).maybeSingle();
  if (!ticket) return { error: "Bon de réparation introuvable" };

  const { error } = await supabase
    .from("repair_tickets")
    .update({
      diagnosis: parsed.data.diagnosis ?? null,
      labor_cost: parsed.data.laborCost,
      discount: parsed.data.discount,
      technician_id: parsed.data.technicianId || null,
    })
    .eq("id", ticketId);
  if (error) {
    console.error("[updateRepairDetailsAction] Échec :", error.message);
    return { error: "Impossible d'enregistrer" };
  }

  revalidatePath(`/reparations/${ticketId}`);
  return { success: "Enregistré" };
}

const addItemSchema = z.object({
  productId: z.string().min(1, "Choisissez une pièce"),
  quantity: z.coerce.number().int().positive("Quantité invalide"),
  unitPrice: z.coerce.number().min(0, "Prix invalide"),
});

export async function addRepairItemAction(ticketId: string, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.REPAIRS_MANAGE);
  if (!(await isRepairModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = addItemSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const { data: ticket } = await supabase
    .from("repair_tickets")
    .select("id, locationId:location_id, status, number")
    .eq("id", ticketId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!ticket) return { error: "Bon de réparation introuvable" };
  if (ticket.status === "LIVRE" || ticket.status === "ANNULE") return { error: "Ce bon est déjà clôturé" };

  const { data: product } = await supabase.from("products").select("id, name").eq("id", data.productId).eq("business_id", user.businessId).maybeSingle();
  if (!product) return { error: "Pièce introuvable" };

  const { oldStock, newStock } = await adjustStock({ productId: data.productId, locationId: ticket.locationId, delta: -data.quantity });

  const { error: itemError } = await supabase.from("repair_ticket_items").insert({
    repair_ticket_id: ticketId,
    product_id: data.productId,
    quantity: data.quantity,
    unit_price: data.unitPrice,
    total: data.quantity * data.unitPrice,
  });
  if (itemError) {
    console.error("[addRepairItemAction] Échec de l'enregistrement de la pièce :", itemError.message);
    // La pièce n'a pas pu être enregistrée sur le bon : on annule le
    // décrément de stock déjà appliqué pour ne pas perdre de marchandise "en l'air".
    await adjustStock({ productId: data.productId, locationId: ticket.locationId, delta: data.quantity });
    return { error: "Impossible d'ajouter la pièce" };
  }

  const { error: movementError } = await supabase.from("stock_movements").insert({
    business_id: user.businessId,
    location_id: ticket.locationId,
    product_id: data.productId,
    direction: "OUT",
    reason: "REPARATION",
    quantity: data.quantity,
    old_stock: oldStock,
    new_stock: newStock,
    user_id: user.id,
    note: `Bon de réparation ${ticket.number}`,
  });
  if (movementError) console.error("[addRepairItemAction] Échec de l'écriture du mouvement de stock :", movementError.message);

  revalidatePath(`/reparations/${ticketId}`);
  revalidatePath("/produits");
  return { success: "Pièce ajoutée" };
}

export async function removeRepairItemAction(itemId: string): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.REPAIRS_MANAGE);
  if (!(await isRepairModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const { data: item } = await supabase
    .from("repair_ticket_items")
    .select("id, productId:product_id, quantity, repairTicket:repair_tickets!inner(id, businessId:business_id, locationId:location_id, number, status)")
    .eq("id", itemId)
    .maybeSingle();
  const ticket = (item?.repairTicket as unknown as { id: string; businessId: string; locationId: string; number: string; status: RepairStatus } | undefined) ?? undefined;
  if (!item || !ticket || ticket.businessId !== user.businessId) return { error: "Pièce introuvable" };
  if (ticket.status === "LIVRE" || ticket.status === "ANNULE") return { error: "Ce bon est déjà clôturé" };

  const { error: deleteError } = await supabase.from("repair_ticket_items").delete().eq("id", itemId);
  if (deleteError) {
    console.error("[removeRepairItemAction] Échec de la suppression :", deleteError.message);
    return { error: "Impossible de retirer la pièce" };
  }

  const { oldStock, newStock } = await adjustStock({ productId: item.productId, locationId: ticket.locationId, delta: item.quantity });
  const { error: movementError } = await supabase.from("stock_movements").insert({
    business_id: user.businessId,
    location_id: ticket.locationId,
    product_id: item.productId,
    direction: "IN",
    reason: "REPARATION",
    quantity: item.quantity,
    old_stock: oldStock,
    new_stock: newStock,
    user_id: user.id,
    note: `Retrait pièce — bon de réparation ${ticket.number}`,
  });
  if (movementError) console.error("[removeRepairItemAction] Échec de l'écriture du mouvement de stock :", movementError.message);

  revalidatePath(`/reparations/${ticket.id}`);
  revalidatePath("/produits");
  return { success: "Pièce retirée" };
}

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Montant invalide"),
  method: z.enum(["ESPECES", "MOBILE_MONEY", "CARTE", "AUTRE"]),
});

export async function recordRepairPaymentAction(ticketId: string, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.REPAIRS_MANAGE);
  if (!(await isRepairModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = paymentSchema.safeParse({ amount: formData.get("amount"), method: formData.get("method") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const ticket = await getRepairTicketAction(ticketId);
  if (!ticket) return { error: "Bon de réparation introuvable" };

  const remaining = ticket.total - ticket.amountPaid;
  if (remaining <= 0) return { error: "Ce bon est déjà réglé intégralement" };
  const amountPaid = ticket.amountPaid + Math.min(parsed.data.amount, remaining);

  const { error } = await supabase
    .from("repair_tickets")
    .update({ amount_paid: amountPaid, payment_method: parsed.data.method })
    .eq("id", ticketId);
  if (error) {
    console.error("[recordRepairPaymentAction] Échec :", error.message);
    return { error: "Impossible d'enregistrer le paiement" };
  }

  revalidatePath(`/reparations/${ticketId}`);
  revalidatePath("/reparations");
  return { success: "Paiement enregistré" };
}

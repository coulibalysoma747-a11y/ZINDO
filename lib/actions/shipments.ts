"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { generateShipmentNumber } from "@/lib/reference";
import type { ShipmentStatus } from "@/lib/db-types";

export type ShipmentRow = {
  id: string;
  number: string;
  carrierName: string;
  waybillNumber: string | null;
  destination: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  cost: number;
  status: ShipmentStatus;
  note: string | null;
  createdAt: string;
  sale: { id: string; number: string } | null;
};

/**
 * "Expéditions" (Paramètres) : suit un colis envoyé par transporteur pour
 * une vente en gros à distance — ne touche jamais au stock (déjà sorti par
 * la facture liée), sert à ne jamais perdre de vue les frais de transport
 * avancés au fil des envois.
 */
export async function getShipmentsAction(): Promise<ShipmentRow[]> {
  const user = await requirePermission(PERMISSIONS.SHIPMENTS_MANAGE);
  const { data } = await supabase
    .from("shipments")
    .select(
      "id, number, carrierName:carrier_name, waybillNumber:waybill_number, destination, recipientName:recipient_name, recipientPhone:recipient_phone, cost, status, note, createdAt:created_at, sale:sales(id, number)"
    )
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as unknown as ShipmentRow[];
}

const createSchema = z.object({
  locationId: z.string().min(1, "Choisissez une boutique"),
  saleId: z.string().optional(),
  carrierName: z.string().min(1, "Indiquez le transporteur"),
  waybillNumber: z.string().optional(),
  destination: z.string().optional(),
  recipientName: z.string().optional(),
  recipientPhone: z.string().optional(),
  cost: z.coerce.number().min(0, "Coût invalide"),
  note: z.string().optional(),
});

export type ActionState = { error?: string } | undefined;

export async function createShipmentAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.SHIPMENTS_MANAGE);
  const parsed = createSchema.safeParse({
    locationId: formData.get("locationId"),
    saleId: formData.get("saleId") || undefined,
    carrierName: formData.get("carrierName"),
    waybillNumber: formData.get("waybillNumber") || undefined,
    destination: formData.get("destination") || undefined,
    recipientName: formData.get("recipientName") || undefined,
    recipientPhone: formData.get("recipientPhone") || undefined,
    cost: formData.get("cost") || 0,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", data.locationId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!location) return { error: "Boutique introuvable" };

  const number = await generateShipmentNumber(user.businessId);
  const { data: shipment, error } = await supabase
    .from("shipments")
    .insert({
      business_id: user.businessId,
      location_id: data.locationId,
      number,
      sale_id: data.saleId || null,
      carrier_name: data.carrierName,
      waybill_number: data.waybillNumber ?? null,
      destination: data.destination ?? null,
      recipient_name: data.recipientName ?? null,
      recipient_phone: data.recipientPhone ?? null,
      cost: data.cost,
      user_id: user.id,
    })
    .select("id")
    .single();
  if (error || !shipment) {
    console.error("[createShipmentAction] Échec de la création :", error?.message);
    return { error: "Impossible d'enregistrer l'expédition" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Shipment",
    entityId: shipment.id as string,
    details: `${number} — ${data.carrierName}`,
  });

  revalidatePath("/expeditions");
  redirect("/expeditions");
}

export async function updateShipmentStatusAction(shipmentId: string, status: ShipmentStatus) {
  const user = await requirePermission(PERMISSIONS.SHIPMENTS_MANAGE);
  const patch: Record<string, unknown> = { status };
  if (status === "ARRIVE") patch.arrived_at = new Date().toISOString();
  if (status === "RETIRE") patch.picked_up_at = new Date().toISOString();

  const { error } = await supabase.from("shipments").update(patch).eq("id", shipmentId).eq("business_id", user.businessId);
  if (error) {
    console.error("[updateShipmentStatusAction] Échec :", error.message);
    return { error: "Impossible de mettre à jour le statut" };
  }
  revalidatePath("/expeditions");
  return { success: true };
}

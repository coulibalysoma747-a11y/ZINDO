"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { generateRentalNumber } from "@/lib/reference";
import type { RentalStatus } from "@/lib/db-types";

export type ActionState = { error?: string } | undefined;

export type RentalRow = {
  id: string;
  number: string;
  quantity: number;
  dailyRate: number;
  deposit: number;
  startDate: string;
  expectedReturnDate: string;
  returnedAt: string | null;
  status: RentalStatus;
  isLate: boolean;
  product: { id: string; name: string; photoUrl: string | null } | null;
  customer: { id: string; name: string; phone: string | null } | null;
};

export async function getRentalsAction(): Promise<RentalRow[]> {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const { data } = await supabase
    .from("rentals")
    .select(
      "id, number, quantity, dailyRate:daily_rate, deposit, startDate:start_date, expectedReturnDate:expected_return_date, returnedAt:returned_at, status, product:products(id, name, photoUrl:photo_url), customer:customers(id, name, phone)"
    )
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false });

  const today = new Date().toISOString().slice(0, 10);
  return ((data ?? []) as unknown as Omit<RentalRow, "isLate">[]).map((r) => ({
    ...r,
    isLate: r.status === "EN_COURS" && r.expectedReturnDate < today,
  }));
}

const createSchema = z.object({
  locationId: z.string().min(1, "Choisissez une boutique"),
  productId: z.string().min(1, "Choisissez un produit"),
  customerId: z.string().optional(),
  quantity: z.coerce.number().int().min(1, "Quantité invalide"),
  dailyRate: z.coerce.number().min(0, "Tarif invalide"),
  deposit: z.coerce.number().min(0, "Caution invalide"),
  startDate: z.string().min(1, "Date de début requise"),
  expectedReturnDate: z.string().min(1, "Date de retour prévue requise"),
  note: z.string().optional(),
});

export async function createRentalAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  const parsed = createSchema.safeParse({
    locationId: formData.get("locationId"),
    productId: formData.get("productId"),
    customerId: formData.get("customerId") || undefined,
    quantity: formData.get("quantity"),
    dailyRate: formData.get("dailyRate"),
    deposit: formData.get("deposit"),
    startDate: formData.get("startDate"),
    expectedReturnDate: formData.get("expectedReturnDate"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  if (data.expectedReturnDate < data.startDate) {
    return { error: "La date de retour prévue doit être après la date de début" };
  }

  const number = await generateRentalNumber(user.businessId);
  const { data: rental, error } = await supabase
    .from("rentals")
    .insert({
      business_id: user.businessId,
      location_id: data.locationId,
      number,
      product_id: data.productId,
      customer_id: data.customerId || null,
      quantity: data.quantity,
      daily_rate: data.dailyRate,
      deposit: data.deposit,
      start_date: data.startDate,
      expected_return_date: data.expectedReturnDate,
      note: data.note ?? null,
      user_id: user.id,
    })
    .select("id")
    .single();
  if (error || !rental) {
    console.error("[createRentalAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer la location" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Rental",
    entityId: rental.id as string,
    details: number,
  });

  revalidatePath("/location");
  redirect("/location");
}

export async function returnRentalAction(id: string) {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  const { data: rental } = await supabase
    .from("rentals")
    .select("id, status")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!rental) return { error: "Location introuvable" };
  if (rental.status !== "EN_COURS") return { error: "Cette location n'est plus en cours" };

  const { error } = await supabase
    .from("rentals")
    .update({ status: "RETOURNEE", returned_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[returnRentalAction] Échec :", error.message);
    return { error: "Impossible de marquer cette location comme retournée" };
  }

  revalidatePath("/location");
  return { success: "Location marquée comme retournée" };
}

export async function cancelRentalAction(id: string) {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  const { data: rental } = await supabase
    .from("rentals")
    .select("id, status")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!rental) return { error: "Location introuvable" };
  if (rental.status !== "EN_COURS") return { error: "Cette location n'est plus en cours" };

  const { error } = await supabase.from("rentals").update({ status: "ANNULEE" }).eq("id", id);
  if (error) {
    console.error("[cancelRentalAction] Échec :", error.message);
    return { error: "Impossible d'annuler cette location" };
  }

  revalidatePath("/location");
  return { success: "Location annulée" };
}

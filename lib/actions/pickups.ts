"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { generatePickupNumber } from "@/lib/reference";
import { adjustStock, getStockQuantity } from "@/lib/stock";

export type PickupRow = {
  id: string;
  number: string;
  partnerName: string;
  partnerPhone: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  amountPaid: number;
  note: string | null;
  createdAt: string;
  product: { id: string; name: string; photoUrl: string | null } | null;
};

/**
 * "Enlèvements partenaires" (Paramètres) : inverse de l'approvisionnement
 * rapide — un confrère vient prendre de la marchandise chez vous. N'entre
 * jamais dans le chiffre d'affaires (table pickups distincte de sales), le
 * solde dû se suit à part des crédits clients habituels.
 */
export async function getPickupsAction(): Promise<PickupRow[]> {
  const user = await requirePermission(PERMISSIONS.STOCK_MANAGE);
  const { data } = await supabase
    .from("pickups")
    .select(
      "id, number, partnerName:partner_name, partnerPhone:partner_phone, quantity, unitPrice:unit_price, total, amountPaid:amount_paid, note, createdAt:created_at, product:products(id, name, photoUrl:photo_url)"
    )
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as unknown as PickupRow[];
}

const createSchema = z.object({
  locationId: z.string().min(1, "Choisissez une boutique"),
  productId: z.string().min(1, "Choisissez un produit"),
  partnerName: z.string().min(1, "Indiquez le nom du confrère"),
  partnerPhone: z.string().optional(),
  quantity: z.coerce.number().int().positive("Quantité invalide"),
  unitPrice: z.coerce.number().min(0, "Prix invalide"),
  amountPaid: z.coerce.number().min(0, "Montant invalide"),
  note: z.string().optional(),
});

export type ActionState = { error?: string } | undefined;

export async function createPickupAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.STOCK_MANAGE);
  const parsed = createSchema.safeParse({
    locationId: formData.get("locationId"),
    productId: formData.get("productId"),
    partnerName: formData.get("partnerName"),
    partnerPhone: formData.get("partnerPhone") || undefined,
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    amountPaid: formData.get("amountPaid") || 0,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const [{ data: location }, { data: product }] = await Promise.all([
    supabase.from("locations").select("id").eq("id", data.locationId).eq("business_id", user.businessId).maybeSingle(),
    supabase.from("products").select("id, name").eq("id", data.productId).eq("business_id", user.businessId).maybeSingle(),
  ]);
  if (!location) return { error: "Boutique introuvable" };
  if (!product) return { error: "Produit introuvable" };

  const available = await getStockQuantity(data.productId, data.locationId);
  if (available < data.quantity) {
    return { error: `Stock insuffisant pour "${product.name}" (disponible : ${available})` };
  }

  const total = data.quantity * data.unitPrice;
  if (data.amountPaid > total) return { error: "Le montant laissé ne peut pas dépasser le total" };

  const { oldStock, newStock } = await adjustStock({
    productId: data.productId,
    locationId: data.locationId,
    delta: -data.quantity,
  });

  const number = await generatePickupNumber(user.businessId);
  const { data: pickup, error } = await supabase
    .from("pickups")
    .insert({
      business_id: user.businessId,
      location_id: data.locationId,
      number,
      partner_name: data.partnerName,
      partner_phone: data.partnerPhone ?? null,
      product_id: data.productId,
      quantity: data.quantity,
      unit_price: data.unitPrice,
      total,
      amount_paid: data.amountPaid,
      note: data.note ?? null,
      user_id: user.id,
    })
    .select("id")
    .single();
  if (error || !pickup) {
    console.error("[createPickupAction] Échec de la création :", error?.message);
    // Le stock a déjà été décrémenté — on le remet pour ne pas fausser l'inventaire.
    await adjustStock({ productId: data.productId, locationId: data.locationId, delta: data.quantity });
    return { error: "Impossible d'enregistrer l'enlèvement" };
  }

  await supabase.from("stock_movements").insert({
    business_id: user.businessId,
    location_id: data.locationId,
    product_id: data.productId,
    direction: "OUT",
    reason: "ENLEVEMENT",
    quantity: data.quantity,
    old_stock: oldStock,
    new_stock: newStock,
    note: `Enlèvement partenaire — ${data.partnerName}`,
    user_id: user.id,
  });

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "STOCK_OUT",
    entity: "Pickup",
    entityId: pickup.id as string,
    details: `${number} — ${data.partnerName} (${data.quantity} × ${data.unitPrice})`,
  });

  revalidatePath("/enlevements");
  revalidatePath("/stock");
  redirect("/enlevements");
}

export async function recordPickupPaymentAction(pickupId: string, amount: number): Promise<{ error?: string; success?: string }> {
  const user = await requirePermission(PERMISSIONS.STOCK_MANAGE);
  if (amount <= 0) return { error: "Montant invalide" };

  const { data: pickup } = await supabase
    .from("pickups")
    .select("id, total, amountPaid:amount_paid")
    .eq("id", pickupId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!pickup) return { error: "Enlèvement introuvable" };

  const remaining = (pickup.total as number) - (pickup.amountPaid as number);
  if (amount > remaining) return { error: `Le solde restant est de ${remaining}` };

  const { error: paymentError } = await supabase.from("pickup_payments").insert({
    pickup_id: pickupId,
    amount,
    user_id: user.id,
  });
  if (paymentError) {
    console.error("[recordPickupPaymentAction] Échec :", paymentError.message);
    return { error: "Impossible d'enregistrer le paiement" };
  }

  const { error: updateError } = await supabase
    .from("pickups")
    .update({ amount_paid: (pickup.amountPaid as number) + amount })
    .eq("id", pickupId);
  if (updateError) {
    console.error("[recordPickupPaymentAction] Échec de la mise à jour :", updateError.message);
    return { error: "Paiement enregistré mais le solde n'a pas pu être mis à jour" };
  }

  revalidatePath("/enlevements");
  return { success: "Paiement enregistré" };
}

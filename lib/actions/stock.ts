"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { adjustStock, getStockQuantity } from "@/lib/stock";

export type ActionState = { error?: string; success?: string } | undefined;

const IN_REASONS = ["ACHAT", "RETOUR_CLIENT", "CORRECTION", "INVENTAIRE", "AUTRE"] as const;
const OUT_REASONS = [
  "PRODUIT_ENDOMMAGE",
  "PERTE",
  "RETOUR_FOURNISSEUR",
  "CORRECTION",
  "AUTRE",
] as const;

const movementSchema = z.object({
  productId: z.string().min(1, "Sélectionnez un produit"),
  locationId: z.string().min(1, "Sélectionnez une boutique"),
  quantity: z.coerce.number().int().positive("La quantité doit être supérieure à 0"),
  reason: z.string().min(1),
  note: z.string().optional(),
});

export async function createStockMovementAction(
  direction: "IN" | "OUT",
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.STOCK_MANAGE);
  const parsed = movementSchema.safeParse({
    productId: formData.get("productId"),
    locationId: formData.get("locationId"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const allowedReasons: readonly string[] = direction === "IN" ? IN_REASONS : OUT_REASONS;
  if (!allowedReasons.includes(parsed.data.reason)) {
    return { error: "Motif invalide" };
  }

  const [{ data: product }, { data: location }] = await Promise.all([
    supabase.from("products").select("id").eq("id", parsed.data.productId).eq("business_id", user.businessId).maybeSingle(),
    supabase.from("locations").select("id, name").eq("id", parsed.data.locationId).eq("business_id", user.businessId).maybeSingle(),
  ]);
  if (!product) return { error: "Produit introuvable" };
  if (!location) return { error: "Boutique introuvable" };

  if (direction === "OUT") {
    const current = await getStockQuantity(product.id as string, location.id as string);
    if (current < parsed.data.quantity) {
      return { error: `Stock insuffisant (disponible : ${current})` };
    }
  }

  const { oldStock, newStock } = await adjustStock({
    productId: product.id as string,
    locationId: location.id as string,
    delta: direction === "IN" ? parsed.data.quantity : -parsed.data.quantity,
  });

  const { error: movementError } = await supabase.from("stock_movements").insert({
    business_id: user.businessId,
    location_id: location.id,
    product_id: product.id,
    direction,
    reason: parsed.data.reason,
    quantity: parsed.data.quantity,
    old_stock: oldStock,
    new_stock: newStock,
    note: parsed.data.note ?? null,
    user_id: user.id,
  });
  if (movementError) {
    console.error("[createStockMovementAction] Échec de l'écriture du mouvement :", movementError.message);
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: direction === "IN" ? "STOCK_IN" : "STOCK_OUT",
    entity: "Product",
    entityId: product.id as string,
    details: `${parsed.data.quantity} (${parsed.data.reason}) — ${location.name}`,
  });

  revalidatePath("/stock");
  revalidatePath("/produits");
  revalidatePath(`/produits/${product.id}`);
  redirect("/stock");
}

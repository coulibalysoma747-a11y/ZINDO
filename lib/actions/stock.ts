"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { adjustStock, getStockQuantity } from "@/lib/stock";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";

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
  try {
    return await createStockMovementImpl(direction, formData);
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[createStockMovementAction] Erreur inattendue :", e);
    return { error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

async function createStockMovementImpl(direction: "IN" | "OUT", formData: FormData): Promise<ActionState> {
  const parsed = movementSchema.safeParse({
    productId: formData.get("productId"),
    locationId: formData.get("locationId"),
    quantity: formData.get("quantity"),
    reason: formData.get("reason"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await createStockMovementCore(direction, parsed.data);
  if (!result.success) return { error: result.error };

  revalidatePath("/stock");
  revalidatePath("/produits");
  revalidatePath(`/produits/${result.productId}`);
  redirect("/stock");
}

export type CreateStockMovementInput = {
  productId: string;
  locationId: string;
  quantity: number;
  reason: string;
  note?: string;
  /** Clé d'idempotence pour un mouvement enregistré hors ligne (voir lib/offline/) — absente pour un mouvement créé normalement en ligne. */
  clientRef?: string;
};

export type CreateStockMovementResult =
  | { success: true; movementId: string; productId: string }
  | { success: false; error: string };

/** Entrée JSON équivalente à createStockMovementAction, pour le rejeu hors ligne (lib/offline/) — ne redirige jamais, contrairement à la variante FormData ci-dessus. */
export async function createStockMovementJsonAction(
  direction: "IN" | "OUT",
  input: CreateStockMovementInput
): Promise<CreateStockMovementResult> {
  try {
    const result = await createStockMovementCore(direction, input);
    if (result.success) {
      revalidatePath("/stock");
      revalidatePath("/produits");
      revalidatePath(`/produits/${result.productId}`);
    }
    return result;
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[createStockMovementJsonAction] Erreur inattendue :", e);
    return { success: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

async function createStockMovementCore(
  direction: "IN" | "OUT",
  input: { productId: string; locationId: string; quantity: number; reason: string; note?: string; clientRef?: string }
): Promise<CreateStockMovementResult> {
  const user = await requirePermission(PERMISSIONS.STOCK_MANAGE);

  if (input.clientRef) {
    const { data: existing } = await supabase
      .from("stock_movements")
      .select("id, product_id")
      .eq("business_id", user.businessId)
      .eq("client_ref", input.clientRef)
      .maybeSingle();
    if (existing) return { success: true, movementId: existing.id as string, productId: existing.product_id as string };
  }

  const allowedReasons: readonly string[] = direction === "IN" ? IN_REASONS : OUT_REASONS;
  if (!allowedReasons.includes(input.reason)) {
    return { success: false, error: "Motif invalide" };
  }

  const [{ data: product }, { data: location }] = await Promise.all([
    supabase.from("products").select("id").eq("id", input.productId).eq("business_id", user.businessId).maybeSingle(),
    supabase.from("locations").select("id, name").eq("id", input.locationId).eq("business_id", user.businessId).maybeSingle(),
  ]);
  if (!product) return { success: false, error: "Produit introuvable" };
  if (!location) return { success: false, error: "Boutique introuvable" };

  if (direction === "OUT") {
    const current = await getStockQuantity(product.id as string, location.id as string);
    if (current < input.quantity) {
      return { success: false, error: `Stock insuffisant (disponible : ${current})` };
    }
  }

  const { oldStock, newStock } = await adjustStock({
    productId: product.id as string,
    locationId: location.id as string,
    delta: direction === "IN" ? input.quantity : -input.quantity,
  });

  const { data: movement, error: movementError } = await supabase
    .from("stock_movements")
    .insert({
      business_id: user.businessId,
      location_id: location.id,
      product_id: product.id,
      direction,
      reason: input.reason,
      quantity: input.quantity,
      old_stock: oldStock,
      new_stock: newStock,
      note: input.note ?? null,
      user_id: user.id,
      client_ref: input.clientRef ?? null,
    })
    .select("id")
    .single();
  if (movementError || !movement) {
    console.error("[createStockMovementCore] Échec de l'écriture du mouvement :", movementError?.message);
    return { success: false, error: "Impossible d'enregistrer le mouvement de stock" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: direction === "IN" ? "STOCK_IN" : "STOCK_OUT",
    entity: "Product",
    entityId: product.id as string,
    details: `${input.quantity} (${input.reason}) — ${location.name}`,
  });

  return { success: true, movementId: movement.id as string, productId: product.id as string };
}

const bulkEntrySchema = z.object({ productId: z.string().min(1), quantity: z.coerce.number().int().min(0) });
const bulkFillSchema = z.object({
  locationId: z.string().min(1, "Sélectionnez une boutique"),
  mode: z.enum(["add", "set"]),
  entries: z.array(bulkEntrySchema).min(1, "Aucun produit sélectionné"),
});

export type BulkFillEntry = { productId: string; quantity: number };

/**
 * "Remplir le stock en un clic" — applique une même quantité (ou une valeur
 * individuelle modifiée avant validation) à plusieurs produits d'un coup.
 * Chaque produit reçoit tout de même son propre mouvement de stock signé de
 * l'auteur (reason CORRECTION), comme un ajustement normal — rien n'est
 * invisible, contrairement à une écriture directe en base.
 */
export async function bulkFillStockAction(
  locationId: string,
  mode: "add" | "set",
  entries: BulkFillEntry[]
): Promise<{ error?: string; success?: string; updated?: number }> {
  const user = await requirePermission(PERMISSIONS.STOCK_MANAGE);
  const parsed = bulkFillSchema.safeParse({ locationId, mode, entries });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: location } = await supabase
    .from("locations")
    .select("id, name")
    .eq("id", parsed.data.locationId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!location) return { error: "Boutique introuvable" };

  // Par paquets de 150 : un seul .in() avec des centaines d'identifiants
  // dépasse la longueur d'URL acceptée par PostgREST — la requête échouait,
  // aucun produit n'était reconnu et rien n'était mis à jour, sans message.
  const productIds = parsed.data.entries.map((e) => e.productId);
  const chunks: string[][] = [];
  for (let i = 0; i < productIds.length; i += 150) chunks.push(productIds.slice(i, i + 150));
  const chunkResults = await Promise.all(
    chunks.map((ids) => supabase.from("products").select("id").in("id", ids).eq("business_id", user.businessId))
  );
  const failed = chunkResults.find((r) => r.error);
  if (failed?.error) return { error: `Vérification des produits impossible : ${failed.error.message}` };
  const validProductIds = new Set(chunkResults.flatMap((r) => (r.data ?? []).map((p) => p.id as string)));

  // Plusieurs produits traités à la fois (adjust_stock est atomique côté
  // base) : un par un, 500 produits demandaient plusieurs minutes.
  let updated = 0;
  const fillOne = async (entry: (typeof parsed.data.entries)[number]) => {
    if (!validProductIds.has(entry.productId)) return;

    let delta: number;
    if (parsed.data.mode === "add") {
      delta = entry.quantity;
    } else {
      const current = await getStockQuantity(entry.productId, location.id as string);
      delta = entry.quantity - current;
    }
    if (delta === 0) return;

    const { oldStock, newStock } = await adjustStock({ productId: entry.productId, locationId: location.id as string, delta });
    await supabase.from("stock_movements").insert({
      business_id: user.businessId,
      location_id: location.id,
      product_id: entry.productId,
      direction: delta > 0 ? "IN" : "OUT",
      reason: "CORRECTION",
      quantity: Math.abs(delta),
      old_stock: oldStock,
      new_stock: newStock,
      note: "Remplissage en un clic",
      user_id: user.id,
    });
    updated += 1;
  };
  const queue = [...parsed.data.entries];
  await Promise.all(
    Array.from({ length: Math.min(8, queue.length) }, async () => {
      for (let entry = queue.shift(); entry; entry = queue.shift()) await fillOne(entry);
    })
  );

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "STOCK_IN",
    entity: "Location",
    entityId: location.id as string,
    details: `Remplissage en un clic : ${updated} produit(s) — ${location.name}`,
  });

  revalidatePath("/stock");
  revalidatePath("/produits");
  return { success: `${updated} produit(s) mis à jour`, updated };
}

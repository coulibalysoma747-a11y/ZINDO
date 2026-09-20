"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { generateProductReference } from "@/lib/reference";
import { adjustStock } from "@/lib/stock";

export type QuickSupplyRow = {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  note: string | null;
  createdAt: string;
  product: { id: string; name: string } | null;
  user: { firstName: string; lastName: string };
};

export async function getQuickSuppliesAction(): Promise<QuickSupplyRow[]> {
  const user = await requirePermission(PERMISSIONS.QUICK_SUPPLY_MANAGE);
  const { data } = await supabase
    .from("quick_supplies")
    .select(
      "id, quantity, unitPrice:unit_price, total, note, createdAt:created_at, product:products(id, name), user:users(firstName:first_name, lastName:last_name)"
    )
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as QuickSupplyRow[];
}

const schema = z.object({
  locationId: z.string().min(1, "Choisissez une boutique"),
  productId: z.string().optional(),
  newProductName: z.string().optional(),
  quantity: z.coerce.number().int().positive("Quantité invalide"),
  unitPrice: z.coerce.number().min(0, "Prix invalide"),
  note: z.string().optional(),
});

export type QuickSupplyResult = { error?: string; success?: string };

/**
 * "Approvisionnement rapide" (Paramètres) : fait entrer de la marchandise en
 * 30 secondes sans fournisseur ni bon de commande. Si le produit n'existe
 * pas encore, il est créé dans le même geste avec son prix. Le stock reçoit
 * un mouvement signé de son auteur (reason ACHAT), comme un ajustement
 * normal — ce n'est jamais le module Achats (pas de dette fournisseur).
 */
export async function quickSupplyAction(formData: FormData): Promise<QuickSupplyResult> {
  const user = await requirePermission(PERMISSIONS.QUICK_SUPPLY_MANAGE);
  const parsed = schema.safeParse({
    locationId: formData.get("locationId"),
    productId: formData.get("productId") || undefined,
    newProductName: formData.get("newProductName") || undefined,
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  if (!data.productId && !data.newProductName) {
    return { error: "Choisissez un produit existant ou donnez un nom pour en créer un" };
  }

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", data.locationId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!location) return { error: "Boutique introuvable" };

  let productId = data.productId ?? null;

  if (!productId && data.newProductName) {
    const reference = await generateProductReference(user.businessId);
    const { data: newProduct, error: createError } = await supabase
      .from("products")
      .insert({
        business_id: user.businessId,
        reference,
        name: data.newProductName,
        purchase_price: data.unitPrice,
        sale_price: data.unitPrice,
      })
      .select("id")
      .single();
    if (createError || !newProduct) {
      console.error("[quickSupplyAction] Échec de la création du produit :", createError?.message);
      return { error: "Impossible de créer le produit" };
    }
    productId = newProduct.id as string;
  } else if (productId) {
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("business_id", user.businessId)
      .maybeSingle();
    if (!product) return { error: "Produit introuvable" };
    // Le prix de revient réel se recalcule via le module Prix de revient
    // (historique des achats) — ici on ne met à jour que le prix d'achat
    // affiché sur la fiche, avec le dernier prix payé.
    await supabase.from("products").update({ purchase_price: data.unitPrice }).eq("id", productId);
  }
  if (!productId) return { error: "Produit introuvable" };

  const { oldStock, newStock } = await adjustStock({ productId, locationId: data.locationId, delta: data.quantity });

  const total = data.quantity * data.unitPrice;
  await supabase.from("stock_movements").insert({
    business_id: user.businessId,
    location_id: data.locationId,
    product_id: productId,
    direction: "IN",
    reason: "ACHAT",
    quantity: data.quantity,
    old_stock: oldStock,
    new_stock: newStock,
    note: "Approvisionnement rapide",
    user_id: user.id,
  });

  const { error: supplyError } = await supabase.from("quick_supplies").insert({
    business_id: user.businessId,
    location_id: data.locationId,
    product_id: productId,
    quantity: data.quantity,
    unit_price: data.unitPrice,
    total,
    note: data.note ?? null,
    user_id: user.id,
  });
  if (supplyError) console.error("[quickSupplyAction] Échec de l'historique :", supplyError.message);

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "STOCK_IN",
    entity: "Product",
    entityId: productId,
    details: `Approvisionnement rapide : ${data.quantity} × ${data.unitPrice}`,
  });

  revalidatePath("/approvisionnement");
  revalidatePath("/produits");
  revalidatePath("/stock");
  return { success: "Marchandise ajoutée au stock" };
}

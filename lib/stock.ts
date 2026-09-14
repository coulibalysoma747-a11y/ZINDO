import "server-only";
import { supabase } from "@/lib/supabase";

export async function getStockQuantity(productId: string, locationId: string) {
  const { data } = await supabase
    .from("product_stocks")
    .select("quantity")
    .eq("product_id", productId)
    .eq("location_id", locationId)
    .maybeSingle();
  return (data?.quantity as number | undefined) ?? 0;
}

/**
 * Applique un delta (positif ou négatif) au stock d'un produit dans une boutique,
 * en créant la ligne product_stocks si elle n'existe pas encore. Retourne l'ancien
 * et le nouveau stock pour l'enregistrement du mouvement associé. Atomique côté
 * base (fonction Postgres adjust_stock, voir supabase/schema.sql).
 */
export async function adjustStock(params: { productId: string; locationId: string; delta: number }) {
  const { productId, locationId, delta } = params;
  const { data, error } = await supabase.rpc("adjust_stock", {
    p_product_id: productId,
    p_location_id: locationId,
    p_delta: delta,
  });
  if (error || !data || data.length === 0) {
    throw new Error(`Échec de l'ajustement du stock : ${error?.message ?? "réponse vide"}`);
  }
  const row = data[0] as { old_stock: number; new_stock: number };
  return { oldStock: row.old_stock, newStock: row.new_stock };
}

import "server-only";
import { supabase } from "@/lib/supabase";

/**
 * Articles d'une vente en unités de base (quantité de colis × multiplicateur),
 * pour réintégrer au stock exactement ce que la vente en avait retiré (voir
 * createSaleImpl). Sans le multiplicateur, annuler la vente d'un « Carton de
 * 12 » ne remettait qu'une seule unité en stock.
 *
 * Hors de lib/actions/ exprès : un fichier "use server" exposerait cette
 * lecture sans contrôle d'accès. L'appelant vérifie que la vente appartient
 * bien au commerce.
 */
export async function loadSaleItemsInBaseUnits(saleId: string): Promise<{ productId: string; quantity: number }[]> {
  const res = await supabase.from("sale_items").select("productId:product_id, quantity, multiplier").eq("sale_id", saleId);
  let rows: Array<{ productId: string; quantity: number; multiplier?: number | null }> | null = res.data;
  if (res.error && /multiplier/.test(res.error.message)) {
    // Même repli que insertSaleItems : colonne multiplier absente pendant la migration.
    rows = (await supabase.from("sale_items").select("productId:product_id, quantity").eq("sale_id", saleId)).data;
  }
  return (rows ?? []).map((r) => ({ productId: r.productId, quantity: Number(r.quantity) * Number(r.multiplier ?? 1) }));
}

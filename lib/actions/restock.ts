"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

export type RestockRow = {
  productId: string;
  name: string;
  reference: string;
  currentStock: number;
  minStock: number;
  suggestedQty: number;
  supplierName: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  reference: string;
  minStock: number;
  stocks: { quantity: number }[];
  supplier: { name: string } | null;
};

/** Produits sous leur seuil minimum, avec une quantité à recommander suggérée. */
export async function getRestockSuggestionsAction(): Promise<RestockRow[]> {
  const user = await requirePermission(PERMISSIONS.STOCK_VIEW);

  const { data } = await supabase
    .from("products")
    .select("id, name, reference, minStock:min_stock, stocks:product_stocks(quantity), supplier:suppliers(name)")
    .eq("business_id", user.businessId)
    .eq("active", true);

  const rows: RestockRow[] = [];
  for (const p of (data ?? []) as unknown as ProductRow[]) {
    const currentStock = p.stocks.reduce((s, st) => s + st.quantity, 0);
    if (currentStock > p.minStock) continue;
    // Heuristique simple : reconstituer un peu plus que le double du seuil
    // minimum, pour ne pas repasser sous l'alerte dès la prochaine vente.
    const suggestedQty = Math.max(p.minStock * 2 - currentStock, p.minStock || 1);
    rows.push({
      productId: p.id,
      name: p.name,
      reference: p.reference,
      currentStock,
      minStock: p.minStock,
      suggestedQty,
      supplierName: p.supplier?.name ?? null,
    });
  }

  return rows.sort((a, b) => a.currentStock - b.currentStock);
}

"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

export type CostPriceRow = {
  productId: string;
  name: string;
  reference: string;
  listedPurchasePrice: number;
  averageCost: number | null;
  salePrice: number;
  marginOnAverage: number | null;
};

type ProductRow = { id: string; name: string; reference: string; purchasePrice: number; salePrice: number };
type PurchaseItemRow = { productId: string; quantity: number; unitPrice: number };

/**
 * Coût de revient réel par produit : moyenne pondérée des prix d'achat
 * effectivement payés (historique des achats), à comparer au simple
 * "prix d'achat" statique renseigné sur la fiche produit — les deux
 * peuvent diverger si les prix fournisseurs ont bougé depuis.
 */
export async function getCostPriceReportAction(): Promise<CostPriceRow[]> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);

  const [{ data: productsData }, { data: purchaseIdsData }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, reference, purchasePrice:purchase_price, salePrice:sale_price")
      .eq("business_id", user.businessId)
      .eq("active", true),
    supabase.from("purchases").select("id").eq("business_id", user.businessId),
  ]);

  const products = (productsData ?? []) as unknown as ProductRow[];
  const purchaseIds = ((purchaseIdsData ?? []) as Array<{ id: string }>).map((p) => p.id);

  const { data: purchaseItemsData } =
    purchaseIds.length > 0
      ? await supabase.from("purchase_items").select("productId:product_id, quantity, unitPrice:unit_price").in("purchase_id", purchaseIds)
      : { data: [] as PurchaseItemRow[] };
  const purchaseItems = (purchaseItemsData ?? []) as unknown as PurchaseItemRow[];

  const totals = new Map<string, { qty: number; cost: number }>();
  for (const item of purchaseItems) {
    const t = totals.get(item.productId) ?? { qty: 0, cost: 0 };
    t.qty += item.quantity;
    t.cost += item.quantity * item.unitPrice;
    totals.set(item.productId, t);
  }

  return products
    .map((p) => {
      const t = totals.get(p.id);
      const averageCost = t && t.qty > 0 ? t.cost / t.qty : null;
      return {
        productId: p.id,
        name: p.name,
        reference: p.reference,
        listedPurchasePrice: p.purchasePrice,
        averageCost,
        salePrice: p.salePrice,
        marginOnAverage: averageCost !== null ? p.salePrice - averageCost : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

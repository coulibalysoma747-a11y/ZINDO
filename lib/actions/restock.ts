"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabase-paging";
import {
  computeSmartRestock,
  RESTOCK_HISTORY_DAYS,
  type EngineMovement,
  type EngineProduct,
  type EnginePurchaseLine,
  type EngineSupplier,
  type SmartRestockResult,
} from "@/lib/restock-engine";

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

const PRICE_HISTORY_DAYS = 365;
const OPEN_ORDER_STATUSES = ["ENVOYEE", "PRIX_RECUS", "CONFIRMEE"];

/**
 * Réassort intelligent (module "bons-de-commande") : vitesse de vente sur 90
 * jours, cartons, délai et meilleur coût fournisseur — voir lib/restock-engine.ts.
 */
export async function getSmartRestockAction(options: {
  coverageDays: number;
  budget: number | null;
}): Promise<SmartRestockResult> {
  const user = await requirePermission(PERMISSIONS.STOCK_VIEW);
  const businessId = user.businessId;
  const since = new Date(Date.now() - RESTOCK_HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const priceSince = new Date(Date.now() - PRICE_HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [products, movements, suppliersRes, purchaseLines, openItems] = await Promise.all([
    fetchAllPages<EngineProduct>((from, to) =>
      supabase
        .from("products")
        .select(
          "id, name, reference, unit, minStock:min_stock, unitsPerCarton:units_per_carton, supplierId:supplier_id, salePrice:sale_price, purchasePrice:purchase_price, createdAt:created_at, stocks:product_stocks(locationId:location_id, quantity)"
        )
        .eq("business_id", businessId)
        .eq("active", true)
        .order("id")
        .range(from, to) as unknown as PromiseLike<{ data: EngineProduct[] | null; error: { message: string } | null }>
    ),
    fetchAllPages<EngineMovement>((from, to) =>
      supabase
        .from("stock_movements")
        .select(
          "productId:product_id, locationId:location_id, direction, reason, quantity, oldStock:old_stock, newStock:new_stock, createdAt:created_at"
        )
        .eq("business_id", businessId)
        .gte("created_at", since)
        .order("created_at")
        .order("id")
        .range(from, to) as unknown as PromiseLike<{ data: EngineMovement[] | null; error: { message: string } | null }>
    ),
    supabase.from("suppliers").select("id, name, leadTimeDays:lead_time_days").eq("business_id", businessId),
    fetchAllPages<{
      productId: string;
      unitPrice: number;
      quantity: number;
      purchase: { id: string; supplierId: string; transportCost: number; createdAt: string };
    }>((from, to) =>
      supabase
        .from("purchase_items")
        .select(
          "productId:product_id, unitPrice:unit_price, quantity, purchase:purchases!inner(id, supplierId:supplier_id, transportCost:transport_cost, createdAt:created_at, business_id)"
        )
        .eq("purchase.business_id", businessId)
        .gte("purchase.created_at", priceSince)
        .order("id")
        .range(from, to) as unknown as PromiseLike<{
        data: { productId: string; unitPrice: number; quantity: number; purchase: { id: string; supplierId: string; transportCost: number; createdAt: string } }[] | null;
        error: { message: string } | null;
      }>
    ),
    fetchAllPages<{ productId: string; quantity: number; order: { groupNumber: string } }>((from, to) =>
      supabase
        .from("purchase_order_items")
        .select("productId:product_id, quantity, order:purchase_orders!inner(business_id, status, groupNumber:group_number)")
        .eq("order.business_id", businessId)
        .in("order.status", OPEN_ORDER_STATUSES)
        .order("id")
        .range(from, to) as unknown as PromiseLike<{ data: { productId: string; quantity: number; order: { groupNumber: string } }[] | null; error: { message: string } | null }>
    ),
  ]);

  // Une même mise en concurrence envoie les mêmes produits à plusieurs
  // fournisseurs : seule la commande confirmée arrivera vraiment, on ne
  // compte donc que le maximum par groupe, puis la somme des groupes.
  const perGroup = new Map<string, number>();
  for (const item of openItems) {
    const key = item.productId + "|" + item.order.groupNumber;
    perGroup.set(key, Math.max(perGroup.get(key) ?? 0, item.quantity));
  }
  const onOrder = new Map<string, number>();
  for (const [key, qty] of perGroup) {
    const productId = key.split("|")[0];
    onOrder.set(productId, (onOrder.get(productId) ?? 0) + qty);
  }

  const lines: EnginePurchaseLine[] = purchaseLines.map((l) => ({
    productId: l.productId,
    supplierId: l.purchase.supplierId,
    purchaseId: l.purchase.id,
    unitPrice: l.unitPrice,
    quantity: l.quantity,
    transportCost: l.purchase.transportCost ?? 0,
    createdAt: l.purchase.createdAt,
  }));

  return computeSmartRestock({
    products,
    movements,
    suppliers: (suppliersRes.data ?? []) as unknown as EngineSupplier[],
    purchaseLines: lines,
    onOrder,
    coverageDays: options.coverageDays,
    budget: options.budget,
  });
}

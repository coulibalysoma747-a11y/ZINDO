import "server-only";
import { supabase } from "@/lib/supabase";

function applyDateFilter<T>(query: T, dateFrom: Date | undefined, dateTo: Date | undefined, column = "created_at") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any;
  if (dateFrom) q = q.gte(column, dateFrom.toISOString());
  if (dateTo) q = q.lt(column, dateTo.toISOString());
  return q;
}

export async function getSalesReport(businessId: string, locationId: string, dateFrom?: Date, dateTo?: Date) {
  const { data } = await applyDateFilter(
    supabase
      .from("sales")
      .select("id, items:sale_items(productId:product_id, quantity, total, unitPrice:unit_price, unitCost:unit_cost), total")
      .eq("business_id", businessId)
      .eq("location_id", locationId)
      .neq("status", "ANNULEE"),
    dateFrom,
    dateTo
  );
  const sales = (data ?? []) as unknown as Array<{
    id: string;
    total: number;
    items: Array<{ productId: string; quantity: number; total: number; unitPrice: number; unitCost: number }>;
  }>;

  const revenue = sales.reduce((s, sale) => s + sale.total, 0);
  const profit = sales.reduce(
    (s, sale) => s + sale.items.reduce((si, i) => si + (i.unitPrice - i.unitCost) * i.quantity, 0),
    0
  );
  const itemsSold = sales.reduce((s, sale) => s + sale.items.reduce((si, i) => si + i.quantity, 0), 0);

  const byProduct = new Map<string, { productId: string; quantity: number; total: number }>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const existing = byProduct.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += item.total;
      } else {
        byProduct.set(item.productId, { productId: item.productId, quantity: item.quantity, total: item.total });
      }
    }
  }
  const { data: products } = byProduct.size
    ? await supabase.from("products").select("id, name").in("id", Array.from(byProduct.keys()))
    : { data: [] as { id: string; name: string }[] };
  const nameMap = new Map((products ?? []).map((p) => [p.id as string, p.name as string]));
  const topProducts = Array.from(byProduct.values())
    .map((p) => ({ ...p, name: nameMap.get(p.productId) ?? "Produit supprimé" }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return { revenue, profit, salesCount: sales.length, itemsSold, topProducts };
}

export async function getStockReport(businessId: string, locationId: string) {
  const { data } = await supabase
    .from("product_stocks")
    .select(
      "quantity, product:products!inner(id, name, purchasePrice:purchase_price, salePrice:sale_price, minStock:min_stock, businessId:business_id, active, category:categories(name))"
    )
    .eq("location_id", locationId)
    .eq("products.business_id", businessId)
    .eq("products.active", true);

  const stocks = (data ?? []) as unknown as Array<{
    quantity: number;
    product: {
      id: string;
      name: string;
      purchasePrice: number;
      salePrice: number;
      minStock: number;
      category: { name: string } | null;
    };
  }>;

  const stockValue = stocks.reduce((s, st) => s + st.quantity * st.product.purchasePrice, 0);
  const potentialValue = stocks.reduce((s, st) => s + st.quantity * st.product.salePrice, 0);
  const outOfStock = stocks.filter((st) => st.quantity <= 0).map((st) => st.product);
  const lowStock = stocks
    .filter((st) => st.quantity > 0 && st.quantity <= st.product.minStock)
    .map((st) => ({ ...st.product, quantity: st.quantity }));

  return { stockValue, potentialValue, outOfStock, lowStock };
}

export async function getPurchasesReport(businessId: string, locationId: string, dateFrom?: Date, dateTo?: Date) {
  const { data } = await applyDateFilter(
    supabase
      .from("purchases")
      .select("id, total, supplierId:supplier_id, supplier:suppliers(name)")
      .eq("business_id", businessId)
      .eq("location_id", locationId),
    dateFrom,
    dateTo
  );
  const purchases = (data ?? []) as unknown as Array<{
    id: string;
    total: number;
    supplierId: string;
    supplier: { name: string };
  }>;

  const total = purchases.reduce((s, p) => s + p.total, 0);
  const bySupplier = new Map<string, { name: string; total: number }>();
  for (const p of purchases) {
    const existing = bySupplier.get(p.supplierId);
    if (existing) existing.total += p.total;
    else bySupplier.set(p.supplierId, { name: p.supplier.name, total: p.total });
  }

  return {
    total,
    purchaseCount: purchases.length,
    suppliers: Array.from(bySupplier.values()).sort((a, b) => b.total - a.total),
  };
}

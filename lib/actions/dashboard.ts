import "server-only";
import { supabase } from "@/lib/supabase";
import { startOfToday, startOfMonth } from "@/lib/format";

export async function getDashboardData(businessId: string, locationId: string) {
  const today = startOfToday();
  const monthStart = startOfMonth();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  // Point de départ des ventes "récentes" (7 derniers jours, pour le mini
  // graphique du tableau de bord mobile) — peut déborder avant le début du
  // mois en cours, donc une requête séparée de monthSales plutôt qu'un filtre
  // sur les mêmes lignes.
  const recentStart = sevenDaysAgo < monthStart ? sevenDaysAgo : monthStart;

  const [salesRes, stocksRes] = await Promise.all([
    supabase
      .from("sales")
      .select("id, total, createdAt:created_at")
      .eq("business_id", businessId)
      .eq("location_id", locationId)
      .neq("status", "ANNULEE")
      .gte("created_at", recentStart.toISOString()),
    supabase
      .from("product_stocks")
      .select("quantity, product:products!inner(id, name, purchasePrice:purchase_price, minStock:min_stock, businessId:business_id, active)")
      .eq("location_id", locationId)
      .eq("products.business_id", businessId)
      .eq("products.active", true),
  ]);

  const recentSales = salesRes.data ?? [];
  const monthSales = recentSales.filter((s) => new Date(s.createdAt as string) >= monthStart);
  const todaySales = monthSales.filter((s) => new Date(s.createdAt as string) >= today);
  const salesMonth = monthSales.reduce((sum, s) => sum + (s.total as number), 0);
  const salesToday = todaySales.reduce((sum, s) => sum + (s.total as number), 0);
  const salesCountToday = todaySales.length;

  // Ventes des 7 derniers jours (index 0 = il y a 6 jours, index 6 = aujourd'hui)
  // pour le mini graphique en barres du tableau de bord mobile.
  const salesLast7Days = new Array(7).fill(0) as number[];
  let salesYesterday = 0;
  for (const s of recentSales) {
    const d = new Date(s.createdAt as string);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - dayStart.getTime()) / 86400000);
    const idx = 6 - diffDays;
    if (idx >= 0 && idx < 7) salesLast7Days[idx] += s.total as number;
    if (diffDays === 1) salesYesterday += s.total as number;
  }

  const stocks = (stocksRes.data ?? []) as unknown as Array<{
    quantity: number;
    product: { id: string; name: string; purchasePrice: number; minStock: number };
  }>;
  const stockValue = stocks.reduce((sum, s) => sum + s.quantity * s.product.purchasePrice, 0);
  const productCount = stocks.filter((s) => s.quantity > 0).length;
  const lowStockProducts = stocks
    .filter((s) => s.quantity > 0 && s.quantity <= s.product.minStock)
    .map((s) => ({ id: s.product.id, name: s.product.name, quantity: s.quantity, minStock: s.product.minStock }));
  const outOfStockCount = stocks.filter((s) => s.quantity <= 0).length;

  const todaySaleIds = todaySales.map((s) => s.id as string);
  let profitToday = 0;
  let soldQtyToday = 0;
  if (todaySaleIds.length > 0) {
    const { data: saleItemsToday } = await supabase
      .from("sale_items")
      .select("quantity, unitPrice:unit_price, unitCost:unit_cost")
      .in("sale_id", todaySaleIds);
    for (const i of saleItemsToday ?? []) {
      profitToday += ((i.unitPrice as number) - (i.unitCost as number)) * (i.quantity as number);
      soldQtyToday += i.quantity as number;
    }
  }

  return {
    salesToday,
    salesYesterday,
    salesLast7Days,
    salesMonth,
    profitToday,
    productCount,
    stockValue,
    salesCountToday,
    soldQtyToday,
    lowStockProducts,
    outOfStockCount,
  };
}

export async function getTopProducts(businessId: string, locationId: string, limit = 5) {
  const monthStart = startOfMonth();

  const { data: sales } = await supabase
    .from("sales")
    .select("id")
    .eq("business_id", businessId)
    .eq("location_id", locationId)
    .neq("status", "ANNULEE")
    .gte("created_at", monthStart.toISOString());
  const saleIds = (sales ?? []).map((s) => s.id as string);
  if (saleIds.length === 0) return [];

  const { data: items } = await supabase
    .from("sale_items")
    .select("productId:product_id, quantity, total")
    .in("sale_id", saleIds);

  const byProduct = new Map<string, { quantity: number; total: number }>();
  for (const i of items ?? []) {
    const key = i.productId as string;
    const acc = byProduct.get(key) ?? { quantity: 0, total: 0 };
    acc.quantity += i.quantity as number;
    acc.total += i.total as number;
    byProduct.set(key, acc);
  }

  const top = [...byProduct.entries()]
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, limit);
  if (top.length === 0) return [];

  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .in("id", top.map(([id]) => id));
  const nameMap = new Map((products ?? []).map((p) => [p.id as string, p.name as string]));

  return top.map(([productId, agg]) => ({
    productId,
    name: nameMap.get(productId) ?? "Produit supprimé",
    quantity: agg.quantity,
    total: agg.total,
  }));
}

/** Valeur du stock pour chaque boutique/dépôt du commerce — vue d'ensemble multi-boutiques. */
export async function getLocationsStockOverview(businessId: string) {
  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, type, isDefault:is_default")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });
  if (!locations || locations.length === 0) return [];

  const { data: stocks } = await supabase
    .from("product_stocks")
    .select("locationId:location_id, quantity, product:products(purchasePrice:purchase_price)")
    .in("location_id", locations.map((l) => l.id as string));

  const valueByLocation = new Map<string, number>();
  for (const s of (stocks ?? []) as unknown as Array<{
    locationId: string;
    quantity: number;
    product: { purchasePrice: number } | null;
  }>) {
    const value = s.quantity * (s.product?.purchasePrice ?? 0);
    valueByLocation.set(s.locationId, (valueByLocation.get(s.locationId) ?? 0) + value);
  }

  return locations.map((l) => ({
    id: l.id as string,
    name: l.name as string,
    type: l.type as string,
    stockValue: valueByLocation.get(l.id as string) ?? 0,
  }));
}

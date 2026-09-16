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

  const [salesRes, stockSummaryRes] = await Promise.all([
    supabase
      .from("sales")
      .select("id, total, createdAt:created_at")
      .eq("business_id", businessId)
      .eq("location_id", locationId)
      .neq("status", "ANNULEE")
      .gte("created_at", recentStart.toISOString()),
    // Agrégé côté base (voir supabase/schema.sql::get_dashboard_stock_summary)
    // plutôt que de rapatrier tout le stock du commerce à chaque chargement du
    // tableau de bord — le volume transféré ne dépend plus de la taille du
    // catalogue.
    supabase.rpc("get_dashboard_stock_summary", {
      p_business_id: businessId,
      p_location_id: locationId,
      p_low_stock_limit: 6,
    }),
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

  const stockSummary = (stockSummaryRes.data ?? {}) as {
    stockValue?: number;
    productCount?: number;
    outOfStockCount?: number;
    lowStockCount?: number;
    lowStockProducts?: Array<{ product_id: string; name: string; quantity: number; min_stock: number }>;
  };
  const stockValue = stockSummary.stockValue ?? 0;
  const productCount = stockSummary.productCount ?? 0;
  const outOfStockCount = stockSummary.outOfStockCount ?? 0;
  // lowStockProducts reste borné (6, pour l'affichage) — lowStockCount porte
  // le vrai total, à utiliser pour tout badge/compteur.
  const lowStockCount = stockSummary.lowStockCount ?? 0;
  const lowStockProducts = (stockSummary.lowStockProducts ?? []).map((p) => ({
    id: p.product_id,
    name: p.name,
    quantity: p.quantity,
    minStock: p.min_stock,
  }));

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
    lowStockCount,
    outOfStockCount,
  };
}

/** Produits les plus vendus du mois — agrégé côté base (supabase/schema.sql::get_top_products). */
export async function getTopProducts(businessId: string, locationId: string, limit = 5) {
  const monthStart = startOfMonth();

  const { data } = await supabase.rpc("get_top_products", {
    p_business_id: businessId,
    p_location_id: locationId,
    p_month_start: monthStart.toISOString(),
    p_limit: limit,
  });

  return ((data ?? []) as Array<{ product_id: string; name: string; quantity: number; total: number }>).map((row) => ({
    productId: row.product_id,
    name: row.name,
    quantity: row.quantity,
    total: row.total,
  }));
}

/** Valeur du stock pour chaque boutique/dépôt du commerce — agrégé côté base (supabase/schema.sql::get_locations_stock_overview). */
export async function getLocationsStockOverview(businessId: string) {
  const [{ data: locations }, { data: stockByLocation }] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name, type, isDefault:is_default")
      .eq("business_id", businessId)
      .eq("active", true)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true }),
    supabase.rpc("get_locations_stock_overview", { p_business_id: businessId }),
  ]);
  if (!locations || locations.length === 0) return [];

  const valueByLocation = new Map(
    ((stockByLocation ?? []) as Array<{ location_id: string; stock_value: number }>).map((s) => [s.location_id, s.stock_value])
  );

  return locations.map((l) => ({
    id: l.id as string,
    name: l.name as string,
    type: l.type as string,
    stockValue: valueByLocation.get(l.id as string) ?? 0,
  }));
}

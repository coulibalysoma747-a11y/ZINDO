import "server-only";
import { supabase } from "@/lib/supabase";
import { startOfMonth } from "@/lib/format";

export type Insight = {
  id: string;
  kind: "stock" | "trend" | "margin";
  tone: "warning" | "success" | "danger" | "info";
  icon: "warning" | "trend-up" | "trend-down" | "bulb";
  title: string;
  message: string;
};

const STOCK_ALERT_DAYS = 5;
const VELOCITY_WINDOW_DAYS = 14;
const TREND_THRESHOLD_PERCENT = 20;
const TREND_MIN_REVENUE = 5000;
const LOW_MARGIN_THRESHOLD_PERCENT = 15;

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getStockRuptureInsights(businessId: string, locationId: string): Promise<Insight[]> {
  const windowStart = daysAgo(VELOCITY_WINDOW_DAYS);

  const [{ data: stocksData }, { data: movementsData }] = await Promise.all([
    supabase
      .from("product_stocks")
      .select("productId:product_id, quantity, product:products!inner(id, name, businessId:business_id, active)")
      .eq("location_id", locationId)
      .gt("quantity", 0)
      .eq("products.business_id", businessId)
      .eq("products.active", true),
    supabase
      .from("stock_movements")
      .select("productId:product_id, quantity")
      .eq("business_id", businessId)
      .eq("location_id", locationId)
      .eq("direction", "OUT")
      .eq("reason", "VENTE")
      .gte("created_at", windowStart.toISOString()),
  ]);

  const stocks = (stocksData ?? []) as unknown as Array<{
    productId: string;
    quantity: number;
    product: { id: string; name: string };
  }>;

  const soldMap = new Map<string, number>();
  for (const m of (movementsData ?? []) as Array<{ productId: string; quantity: number }>) {
    soldMap.set(m.productId, (soldMap.get(m.productId) ?? 0) + m.quantity);
  }

  const candidates = stocks
    .map((s) => {
      const soldInWindow = soldMap.get(s.productId) ?? 0;
      const velocity = soldInWindow / VELOCITY_WINDOW_DAYS;
      const daysLeft = velocity > 0 ? Math.floor(s.quantity / velocity) : null;
      return { name: s.product.name, daysLeft };
    })
    .filter((c): c is { name: string; daysLeft: number } => c.daysLeft !== null && c.daysLeft <= STOCK_ALERT_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  return candidates.map((c, i) => ({
    id: `stock-${i}`,
    kind: "stock",
    tone: c.daysLeft <= 2 ? "danger" : "warning",
    icon: "warning",
    title: "Risque de rupture",
    message: `⚠️ Attention : le stock de ${c.name} diminue rapidement. Vous risquez une rupture dans environ ${c.daysLeft} jour${c.daysLeft > 1 ? "s" : ""}.`,
  }));
}

async function getSalesTrendInsights(businessId: string, locationId: string): Promise<Insight[]> {
  const currentStart = startOfMonth();
  const previousStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);

  const selectItems =
    "total, sale:sales!inner(businessId:business_id, locationId:location_id, status, createdAt:created_at), product:products(category:categories(name))";

  const [{ data: currentData }, { data: previousData }] = await Promise.all([
    supabase
      .from("sale_items")
      .select(selectItems)
      .eq("sales.business_id", businessId)
      .eq("sales.location_id", locationId)
      .neq("sales.status", "ANNULEE")
      .gte("sales.created_at", currentStart.toISOString()),
    supabase
      .from("sale_items")
      .select(selectItems)
      .eq("sales.business_id", businessId)
      .eq("sales.location_id", locationId)
      .neq("sales.status", "ANNULEE")
      .gte("sales.created_at", previousStart.toISOString())
      .lt("sales.created_at", currentStart.toISOString()),
  ]);

  type ItemRow = { total: number; product: { category: { name: string } | null } | null };

  function sumByCategory(items: ItemRow[]) {
    const map = new Map<string, number>();
    for (const item of items) {
      const name = item.product?.category?.name ?? "Sans catégorie";
      map.set(name, (map.get(name) ?? 0) + item.total);
    }
    return map;
  }

  const current = sumByCategory((currentData ?? []) as unknown as ItemRow[]);
  const previous = sumByCategory((previousData ?? []) as unknown as ItemRow[]);

  const trends: { category: string; percent: number; current: number }[] = [];
  for (const [category, currentTotal] of current) {
    const previousTotal = previous.get(category) ?? 0;
    if (previousTotal <= 0 || currentTotal < TREND_MIN_REVENUE) continue;
    const percent = ((currentTotal - previousTotal) / previousTotal) * 100;
    if (Math.abs(percent) >= TREND_THRESHOLD_PERCENT) {
      trends.push({ category, percent, current: currentTotal });
    }
  }

  trends.sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent));

  return trends.slice(0, 3).map((t, i) => {
    const rounded = Math.round(Math.abs(t.percent));
    const up = t.percent > 0;
    return {
      id: `trend-${i}`,
      kind: "trend",
      tone: up ? "success" : "warning",
      icon: up ? "trend-up" : "trend-down",
      title: up ? "Ventes en hausse" : "Ventes en baisse",
      message: `${up ? "📈" : "📉"} Analyse : les ventes de ${t.category} ont ${up ? "augmenté" : "baissé"} de ${rounded} % ce mois-ci.`,
    };
  });
}

async function getMarginInsights(businessId: string, locationId: string): Promise<Insight[]> {
  const currentStart = startOfMonth();

  const { data } = await supabase
    .from("sale_items")
    .select(
      "quantity, sale:sales!inner(businessId:business_id, locationId:location_id, status, createdAt:created_at), product:products(id, name, salePrice:sale_price, purchasePrice:purchase_price)"
    )
    .eq("sales.business_id", businessId)
    .eq("sales.location_id", locationId)
    .neq("sales.status", "ANNULEE")
    .gte("sales.created_at", currentStart.toISOString());

  const items = (data ?? []) as unknown as Array<{
    quantity: number;
    product: { id: string; name: string; salePrice: number; purchasePrice: number } | null;
  }>;
  if (items.length === 0) return [];

  const byProduct = new Map<string, { name: string; qty: number; salePrice: number; purchasePrice: number }>();
  for (const item of items) {
    if (!item.product) continue;
    const existing = byProduct.get(item.product.id);
    if (existing) existing.qty += item.quantity;
    else
      byProduct.set(item.product.id, {
        name: item.product.name,
        qty: item.quantity,
        salePrice: item.product.salePrice,
        purchasePrice: item.product.purchasePrice,
      });
  }

  const rows = Array.from(byProduct.values());
  if (rows.length === 0) return [];
  const avgQty = rows.reduce((s, r) => s + r.qty, 0) / rows.length;

  const lowMargin = rows
    .filter((r) => r.salePrice > 0 && r.qty >= avgQty)
    .map((r) => ({ ...r, marginPercent: ((r.salePrice - r.purchasePrice) / r.salePrice) * 100 }))
    .filter((r) => r.marginPercent < LOW_MARGIN_THRESHOLD_PERCENT)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);

  return lowMargin.map((r, i) => ({
    id: `margin-${i}`,
    kind: "margin",
    tone: "info",
    icon: "bulb",
    title: "Marge à revoir",
    message: `💡 Conseil : votre produit ${r.name} se vend beaucoup mais votre marge est faible (${Math.round(r.marginPercent)} %). Vous pourriez revoir son prix de vente.`,
  }));
}

export async function getBusinessInsights(businessId: string, locationId: string): Promise<Insight[]> {
  const [stock, trend, margin] = await Promise.all([
    getStockRuptureInsights(businessId, locationId),
    getSalesTrendInsights(businessId, locationId),
    getMarginInsights(businessId, locationId),
  ]);
  return [...stock, ...trend, ...margin];
}

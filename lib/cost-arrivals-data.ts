import "server-only";
import { supabase } from "@/lib/supabase";
import type { MarginMode, ShareRule } from "@/lib/landed-cost";

export type ArrivalStatus = "BROUILLON" | "EN_COURS" | "APPLIQUE" | "RETABLI";
export type StockMode = "ENTRER_STOCK" | "PRIX_SEULEMENT";

export type ArrivalRow = {
  id: string;
  name: string;
  reference: string | null;
  arrivalDate: string;
  status: ArrivalStatus;
  stockMode: StockMode;
  averageWithOld: boolean;
  marginMode: MarginMode;
  marginValue: number;
  roundingStep: number;
  currency: string;
  fxRate: number;
  purchaseId: string | null;
  appliedAt: string | null;
  revertedAt: string | null;
  supplierId: string | null;
  supplierName: string | null;
  locationId: string;
  locationName: string;
};

export type ArrivalItemRow = {
  id: string;
  productId: string;
  name: string;
  reference: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  weight: number | null;
  volume: number | null;
  applySalePrice: boolean;
  salePriceOverride: number | null;
  /** Prix actuels du catalogue (avant application) ou, une fois appliqué, ceux d'avant l'application. */
  currentPurchasePrice: number;
  currentSalePrice: number;
  /** Stock total actuel du produit, tous emplacements confondus. */
  currentStock: number;
  /** Renseignés une fois l'arrivage appliqué. */
  appliedAt: string | null;
  oldPurchasePrice: number | null;
  oldSalePrice: number | null;
  newPurchasePrice: number | null;
  newSalePrice: number | null;
  unitCostApplied: number | null;
};

export type ArrivalExpenseRow = {
  id: string;
  label: string;
  amount: number;
  rule: ShareRule;
  manualShares: Record<string, number> | null;
};

export type ArrivalSummary = ArrivalRow & { goodsTotal: number; expensesTotal: number; itemCount: number };

const ARRIVAL_SELECT =
  "id, name, reference, arrivalDate:arrival_date, status, stockMode:stock_mode, averageWithOld:average_with_old, marginMode:margin_mode, marginValue:margin_value, roundingStep:rounding_step, currency, fxRate:fx_rate, purchaseId:purchase_id, appliedAt:applied_at, revertedAt:reverted_at, supplierId:supplier_id, locationId:location_id, supplier:suppliers(name), location:locations(name)";

type RawArrival = Omit<ArrivalRow, "supplierName" | "locationName"> & {
  supplier: { name: string } | null;
  location: { name: string } | null;
};

function toArrival(r: RawArrival): ArrivalRow {
  const { supplier, location, ...rest } = r;
  return { ...rest, supplierName: supplier?.name ?? null, locationName: location?.name ?? "—" };
}

export async function listArrivals(businessId: string): Promise<ArrivalSummary[]> {
  const { data } = await supabase
    .from("cost_arrivals")
    .select(ARRIVAL_SELECT)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(200);
  const arrivals = ((data ?? []) as unknown as RawArrival[]).map(toArrival);
  if (arrivals.length === 0) return [];
  const ids = arrivals.map((a) => a.id);
  const [{ data: items }, { data: expenses }] = await Promise.all([
    supabase.from("cost_arrival_items").select("arrivalId:arrival_id, quantity, unitPrice:unit_price").in("arrival_id", ids),
    supabase.from("cost_arrival_expenses").select("arrivalId:arrival_id, amount").in("arrival_id", ids),
  ]);
  const goods = new Map<string, { sum: number; count: number }>();
  for (const i of (items ?? []) as { arrivalId: string; quantity: number; unitPrice: number }[]) {
    const g = goods.get(i.arrivalId) ?? { sum: 0, count: 0 };
    g.sum += i.quantity * i.unitPrice;
    g.count += 1;
    goods.set(i.arrivalId, g);
  }
  const costs = new Map<string, number>();
  for (const e of (expenses ?? []) as { arrivalId: string; amount: number }[]) {
    costs.set(e.arrivalId, (costs.get(e.arrivalId) ?? 0) + e.amount);
  }
  return arrivals.map((a) => {
    const fx = a.fxRate > 0 ? a.fxRate : 1;
    return {
      ...a,
      goodsTotal: Math.round((goods.get(a.id)?.sum ?? 0) * fx),
      expensesTotal: Math.round((costs.get(a.id) ?? 0) * fx),
      itemCount: goods.get(a.id)?.count ?? 0,
    };
  });
}

export async function getArrival(
  businessId: string,
  id: string
): Promise<{ arrival: ArrivalRow; items: ArrivalItemRow[]; expenses: ArrivalExpenseRow[] } | null> {
  const { data } = await supabase.from("cost_arrivals").select(ARRIVAL_SELECT).eq("id", id).eq("business_id", businessId).maybeSingle();
  if (!data) return null;
  const arrival = toArrival(data as unknown as RawArrival);

  const [{ data: itemData }, { data: expenseData }] = await Promise.all([
    supabase
      .from("cost_arrival_items")
      .select(
        "id, productId:product_id, quantity, unitPrice:unit_price, weight, volume, applySalePrice:apply_sale_price, salePriceOverride:sale_price_override, appliedAt:applied_at, oldPurchasePrice:old_purchase_price, oldSalePrice:old_sale_price, newPurchasePrice:new_purchase_price, newSalePrice:new_sale_price, unitCostApplied:unit_cost, product:products(name, reference, unit, purchasePrice:purchase_price, salePrice:sale_price)"
      )
      .eq("arrival_id", id)
      .order("position", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("cost_arrival_expenses")
      .select("id, label, amount, rule, manualShares:manual_shares")
      .eq("arrival_id", id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  type RawItem = Omit<ArrivalItemRow, "name" | "reference" | "unit" | "currentPurchasePrice" | "currentSalePrice" | "currentStock"> & {
    product: { name: string; reference: string; unit: string; purchasePrice: number; salePrice: number } | null;
  };
  const rawItems = (itemData ?? []) as unknown as RawItem[];

  const productIds = rawItems.map((i) => i.productId);
  const stockByProduct = new Map<string, number>();
  if (productIds.length > 0) {
    const { data: stocks } = await supabase.from("product_stocks").select("productId:product_id, quantity").in("product_id", productIds);
    for (const s of (stocks ?? []) as { productId: string; quantity: number }[]) {
      stockByProduct.set(s.productId, (stockByProduct.get(s.productId) ?? 0) + Number(s.quantity));
    }
  }

  const items: ArrivalItemRow[] = rawItems.map((r) => {
    const { product, ...rest } = r;
    return {
      ...rest,
      name: product?.name ?? "Produit supprimé",
      reference: product?.reference ?? "",
      unit: product?.unit ?? "unité",
      currentPurchasePrice: product?.purchasePrice ?? 0,
      currentSalePrice: product?.salePrice ?? 0,
      currentStock: stockByProduct.get(r.productId) ?? 0,
    };
  });

  return { arrival, items, expenses: (expenseData ?? []) as unknown as ArrivalExpenseRow[] };
}

export type PriceHistoryRow = {
  id: string;
  createdAt: string;
  reason: "ARRIVAGE" | "RETABLI";
  oldPurchasePrice: number | null;
  newPurchasePrice: number | null;
  oldSalePrice: number | null;
  newSalePrice: number | null;
  stockAtChange: number | null;
  arrivalName: string | null;
};

export async function getPriceHistory(businessId: string, productId: string): Promise<PriceHistoryRow[]> {
  const { data } = await supabase
    .from("product_price_history")
    .select(
      "id, createdAt:created_at, reason, oldPurchasePrice:old_purchase_price, newPurchasePrice:new_purchase_price, oldSalePrice:old_sale_price, newSalePrice:new_sale_price, stockAtChange:stock_at_change, arrival:cost_arrivals(name)"
    )
    .eq("business_id", businessId)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(100);
  return ((data ?? []) as unknown as (Omit<PriceHistoryRow, "arrivalName"> & { arrival: { name: string } | null })[]).map((r) => {
    const { arrival, ...rest } = r;
    return { ...rest, arrivalName: arrival?.name ?? null };
  });
}

import "server-only";
import { supabase } from "@/lib/supabase";
import { startOfToday, startOfMonth, startOfWeek } from "@/lib/format";
import { getStockReport } from "@/lib/actions/reports";

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

type Period = "aujourdhui" | "semaine" | "mois";

function getPeriodRange(period: Period) {
  let from: Date;
  let to: Date;
  let prevFrom: Date;
  if (period === "semaine") {
    from = startOfWeek();
    to = new Date(from);
    to.setDate(to.getDate() + 7);
    prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - 7);
  } else if (period === "mois") {
    from = startOfMonth();
    to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    prevFrom = new Date(from.getFullYear(), from.getMonth() - 1, 1);
  } else {
    from = startOfToday();
    to = new Date(from);
    to.setDate(to.getDate() + 1);
    prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - 1);
  }
  return { from, to, prevFrom, prevTo: from };
}

/** Variation en % entre deux périodes — null (plutôt que Infinity/NaN) quand la période précédente est à 0, faute de référence valable. */
function pctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

type SaleAgg = {
  id: string;
  userId: string;
  amountPaid: number;
  paymentMethod: string;
  cashPortion: number | null;
  mobilePortion: number | null;
  items: Array<{ productId: string; quantity: number; total: number; unitPrice: number; unitCost: number }>;
};

type PaymentAgg = { amount: number; method: string; userId: string; saleId: string | null };

async function fetchSalesForPeriod(businessId: string, locationId: string, from: Date, to: Date): Promise<SaleAgg[]> {
  const ITEMS_SELECT = "items:sale_items(productId:product_id, quantity, total, unitPrice:unit_price, unitCost:unit_cost)";
  const initial = await supabase
    .from("sales")
    .select(
      `id, userId:user_id, amountPaid:amount_paid, paymentMethod:payment_method, cashPortion:cash_portion, mobilePortion:mobile_portion, ${ITEMS_SELECT}`
    )
    .eq("business_id", businessId)
    .eq("location_id", locationId)
    .neq("status", "ANNULEE")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString());
  let data = initial.data;
  // Repli si cash_portion/mobile_portion (paiement mixte) ne sont pas encore
  // migrées côté base — même logique défensive qu'ailleurs dans le code pour
  // une colonne pas encore appliquée, pour ne jamais casser tout le tableau
  // de bord pour ça.
  if (initial.error && /cash_portion|mobile_portion/.test(initial.error.message)) {
    const fallback = await supabase
      .from("sales")
      .select(`id, userId:user_id, amountPaid:amount_paid, paymentMethod:payment_method, ${ITEMS_SELECT}`)
      .eq("business_id", businessId)
      .eq("location_id", locationId)
      .neq("status", "ANNULEE")
      .gte("created_at", from.toISOString())
      .lt("created_at", to.toISOString());
    data = fallback.data ? fallback.data.map((s) => ({ ...s, cashPortion: null, mobilePortion: null })) : null;
  }
  return (data ?? []) as unknown as SaleAgg[];
}

// Les remboursements de crédit (customer_payments) n'ont pas de location_id —
// un client peut rembourser une dette contractée dans n'importe quelle
// boutique du commerce. Contrairement aux ventes ci-dessus, ce montant reste
// donc à l'échelle du commerce entier, pas de la seule boutique courante.
async function fetchPaymentsForPeriod(businessId: string, from: Date, to: Date): Promise<PaymentAgg[]> {
  const { data } = await supabase
    .from("customer_payments")
    .select("amount, method, userId:user_id, saleId:sale_id, customer:customers!inner(businessId:business_id)")
    .eq("customers.business_id", businessId)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString());
  return (data ?? []) as unknown as PaymentAgg[];
}

async function sumExpenses(businessId: string, locationId: string, from: Date, to: Date) {
  const { data } = await supabase
    .from("expenses")
    .select("amount")
    .eq("business_id", businessId)
    .eq("location_id", locationId)
    .gte("date", from.toISOString())
    .lt("date", to.toISOString());
  return (data ?? []).reduce((s, e) => s + (e.amount as number), 0);
}

async function sumPurchases(businessId: string, locationId: string, from: Date, to: Date) {
  const { data } = await supabase
    .from("purchases")
    .select("total")
    .eq("business_id", businessId)
    .eq("location_id", locationId)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString());
  return (data ?? []).reduce((s, p) => s + (p.total as number), 0);
}

/** Chiffres agrégés (encaissé, marge, dépenses...) d'une période, sans comparaison — utilisé une fois pour la période en cours, une fois pour la précédente. */
async function summarize(sales: SaleAgg[], payments: PaymentAgg[], expenses: number, purchases: number) {
  const salesCashedIn = sales.reduce((s, sale) => s + sale.amountPaid, 0);
  const paymentsCashedIn = payments.reduce((s, p) => s + p.amount, 0);
  const cashedIn = salesCashedIn + paymentsCashedIn;
  const margin = sales.reduce(
    (s, sale) => s + sale.items.reduce((si, i) => si + (i.unitPrice - i.unitCost) * i.quantity, 0),
    0
  );
  const itemsSold = sales.reduce((s, sale) => s + sale.items.reduce((si, i) => si + i.quantity, 0), 0);
  const especes =
    sales.filter((s) => s.paymentMethod === "ESPECES").reduce((s, sale) => s + sale.amountPaid, 0) +
    sales.filter((s) => s.paymentMethod === "MIXTE").reduce((s, sale) => s + (sale.cashPortion ?? 0), 0) +
    payments.filter((p) => p.method === "ESPECES").reduce((s, p) => s + p.amount, 0);

  // Détail des encaissements par moyen de paiement (montant + nombre de
  // règlements) — voir Paramètres > "Détail des encaissements" au tableau de
  // bord. Les remboursements de crédit (customer_payments) comptent aussi
  // dans le moyen de paiement utilisé pour rembourser, pas seulement les ventes.
  const byMethod: Record<string, { amount: number; count: number }> = {};
  const addToMethod = (method: string, amount: number) => {
    const m = byMethod[method] ?? { amount: 0, count: 0 };
    m.amount += amount;
    m.count += 1;
    byMethod[method] = m;
  };
  for (const sale of sales) {
    if (sale.paymentMethod === "MIXTE") {
      if (sale.cashPortion) addToMethod("ESPECES", sale.cashPortion);
      if (sale.mobilePortion) addToMethod("MOBILE_MONEY", sale.mobilePortion);
    } else {
      addToMethod(sale.paymentMethod, sale.amountPaid);
    }
  }
  for (const p of payments) addToMethod(p.method, p.amount);

  return {
    cashedIn,
    creditRepayments: paymentsCashedIn,
    salesCount: sales.length,
    itemsSold,
    margin,
    expenses,
    netProfit: margin - expenses,
    purchases,
    avgTicket: sales.length > 0 ? cashedIn / sales.length : 0,
    especes,
    autres: cashedIn - especes,
    byMethod,
  };
}

export type DashboardOverview = ReturnType<typeof buildOverview>;

function buildOverview(
  period: Period,
  current: Awaited<ReturnType<typeof summarize>>,
  previous: Awaited<ReturnType<typeof summarize>>,
  vendorBreakdown: Array<{ userId: string; name: string; total: number; especes: number; count: number }>,
  topByRevenue: Array<{ productId: string; name: string; quantity: number; total: number }>,
  topByMargin: Array<{ productId: string; name: string; margin: number }>,
  categoryBreakdown: Array<{ name: string; total: number }>,
  stockValue: number,
  outOfStock: Array<{ id: string; name: string }>
) {
  return {
    period,
    current,
    deltas: {
      cashedIn: pctDelta(current.cashedIn, previous.cashedIn),
      margin: pctDelta(current.margin, previous.margin),
      expenses: pctDelta(current.expenses, previous.expenses),
      netProfit: pctDelta(current.netProfit, previous.netProfit),
      salesCount: pctDelta(current.salesCount, previous.salesCount),
      avgTicket: pctDelta(current.avgTicket, previous.avgTicket),
      purchases: pctDelta(current.purchases, previous.purchases),
      itemsSold: pctDelta(current.itemsSold, previous.itemsSold),
    },
    vendorBreakdown,
    topByRevenue,
    topByMargin,
    categoryBreakdown,
    stockValue,
    outOfStock,
  };
}

/**
 * Tableau de bord enrichi (indicateurs + comparaison à la période
 * précédente + classements) — calqué sur la maquette FasoStock fournie par
 * l'utilisateur. Étape 1 : chiffres et classements, sans les graphiques
 * (évolution du CA, ventes par catégorie), prévus dans un second temps.
 */
export async function getDashboardOverview(businessId: string, locationId: string, period: Period) {
  const { from, to, prevFrom, prevTo } = getPeriodRange(period);

  const [sales, allPayments, expenses, purchases, prevSales, allPrevPayments, prevExpenses, prevPurchases, stockReport] =
    await Promise.all([
      fetchSalesForPeriod(businessId, locationId, from, to),
      fetchPaymentsForPeriod(businessId, from, to),
      sumExpenses(businessId, locationId, from, to),
      sumPurchases(businessId, locationId, from, to),
      fetchSalesForPeriod(businessId, locationId, prevFrom, prevTo),
      fetchPaymentsForPeriod(businessId, prevFrom, prevTo),
      sumExpenses(businessId, locationId, prevFrom, prevTo),
      sumPurchases(businessId, locationId, prevFrom, prevTo),
      getStockReport(businessId, locationId),
    ]);

  // Un remboursement imputé sur une vente de la même période est déjà dans
  // son montant payé (sale.amount_paid) : ne pas le compter une seconde fois.
  const withoutSalesOf = (list: PaymentAgg[], periodSales: SaleAgg[]) => {
    const ids = new Set(periodSales.map((s) => s.id));
    return list.filter((p) => !p.saleId || !ids.has(p.saleId));
  };
  const payments = withoutSalesOf(allPayments, sales);
  const prevPayments = withoutSalesOf(allPrevPayments, prevSales);

  const current = await summarize(sales, payments, expenses, purchases);
  const previous = await summarize(prevSales, prevPayments, prevExpenses, prevPurchases);

  // Vendeur = utilisateur qui a encaissé (à la vente ou lors d'un
  // remboursement de crédit) — un même vendeur peut apparaître des deux côtés.
  const vendorMap = new Map<string, { total: number; especes: number; count: number }>();
  for (const sale of sales) {
    const v = vendorMap.get(sale.userId) ?? { total: 0, especes: 0, count: 0 };
    v.total += sale.amountPaid;
    if (sale.paymentMethod === "ESPECES") v.especes += sale.amountPaid;
    v.count += 1;
    vendorMap.set(sale.userId, v);
  }
  for (const p of payments) {
    const v = vendorMap.get(p.userId) ?? { total: 0, especes: 0, count: 0 };
    v.total += p.amount;
    if (p.method === "ESPECES") v.especes += p.amount;
    v.count += 1;
    vendorMap.set(p.userId, v);
  }
  const vendorIds = Array.from(vendorMap.keys());
  const { data: vendorUsers } = vendorIds.length
    ? await supabase.from("users").select("id, firstName:first_name, lastName:last_name").in("id", vendorIds)
    : { data: [] as { id: string; firstName: string; lastName: string }[] };
  const vendorNameById = new Map((vendorUsers ?? []).map((u) => [u.id as string, `${u.firstName} ${u.lastName}`]));
  const vendorBreakdown = vendorIds
    .map((id) => ({ userId: id, name: vendorNameById.get(id) ?? "Utilisateur supprimé", ...vendorMap.get(id)! }))
    .sort((a, b) => b.total - a.total);

  // Top produits (chiffre d'affaires) et meilleure marge : agrégés sur les
  // mêmes lignes de vente déjà récupérées ci-dessus, sans requête supplémentaire.
  const revenueByProduct = new Map<string, { quantity: number; total: number }>();
  const marginByProduct = new Map<string, number>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const r = revenueByProduct.get(item.productId) ?? { quantity: 0, total: 0 };
      r.quantity += item.quantity;
      r.total += item.total;
      revenueByProduct.set(item.productId, r);
      marginByProduct.set(
        item.productId,
        (marginByProduct.get(item.productId) ?? 0) + (item.unitPrice - item.unitCost) * item.quantity
      );
    }
  }
  const productIds = Array.from(revenueByProduct.keys());
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, name, category:categories(name)").in("id", productIds)
    : { data: [] as { id: string; name: string; category: { name: string } | null }[] };
  const productRows = (products ?? []) as unknown as Array<{ id: string; name: string; category: { name: string } | null }>;
  const productNameById = new Map(productRows.map((p) => [p.id, p.name]));
  const productCategoryById = new Map(productRows.map((p) => [p.id, p.category?.name ?? "Sans catégorie"]));

  const topByRevenue = Array.from(revenueByProduct.entries())
    .map(([productId, r]) => ({ productId, name: productNameById.get(productId) ?? "Produit supprimé", ...r }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const topByMargin = Array.from(marginByProduct.entries())
    .map(([productId, margin]) => ({ productId, name: productNameById.get(productId) ?? "Produit supprimé", margin }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 6);

  // Ventes par catégorie — repli sur les 7 catégories les plus vendues, le
  // reste replié dans "Autres" (voir la palette catégorielle à 8 teintes).
  const revenueByCategory = new Map<string, number>();
  for (const [productId, r] of revenueByProduct) {
    const categoryName = productCategoryById.get(productId) ?? "Sans catégorie";
    revenueByCategory.set(categoryName, (revenueByCategory.get(categoryName) ?? 0) + r.total);
  }
  const sortedCategories = Array.from(revenueByCategory.entries()).sort((a, b) => b[1] - a[1]);
  const categoryBreakdown = sortedCategories.slice(0, 7).map(([name, total]) => ({ name, total }));
  if (sortedCategories.length > 7) {
    const othersTotal = sortedCategories.slice(7).reduce((s, [, total]) => s + total, 0);
    categoryBreakdown.push({ name: "Autres", total: othersTotal });
  }

  const outOfStock = stockReport.outOfStock.map((p) => ({ id: p.id, name: p.name }));

  return buildOverview(
    period,
    current,
    previous,
    vendorBreakdown,
    topByRevenue,
    topByMargin,
    categoryBreakdown,
    stockReport.stockValue,
    outOfStock
  );
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

import "server-only";
import { supabase } from "@/lib/supabase";

export type SessionStats = {
  salesCount: number;
  totalRevenue: number;
  cashCollected: number;
  mobileCollected: number;
  cardCollected: number;
  otherCollected: number;
  creditCollected: number;
  grossMargin: number;
  expensesTotal: number;
  netMargin: number;
  marginRate: number;
  expectedCash: number;
};

/**
 * Calcule les chiffres d'une session de caisse sur sa fenêtre de temps (de
 * l'ouverture à la clôture, ou à maintenant si elle est encore ouverte).
 * Utilisé à la fois pour l'aperçu live avant clôture et pour figer l'instantané
 * final enregistré sur la session au moment où elle est fermée.
 */
export async function computeSessionStats(session: {
  businessId: string;
  locationId: string;
  openingAmount: number;
  openedAt: Date;
  closedAt: Date | null;
}): Promise<SessionStats> {
  const endDate = session.closedAt ?? new Date();

  const [{ data: sales }, { data: expenses }] = await Promise.all([
    supabase
      .from("sales")
      .select("total, amountPaid:amount_paid, paymentMethod:payment_method, items:sale_items(unitCost:unit_cost, quantity)")
      .eq("business_id", session.businessId)
      .eq("location_id", session.locationId)
      .neq("status", "ANNULEE")
      .gte("created_at", session.openedAt.toISOString())
      .lte("created_at", endDate.toISOString()),
    supabase
      .from("expenses")
      .select("amount")
      .eq("business_id", session.businessId)
      .eq("location_id", session.locationId)
      .gte("date", session.openedAt.toISOString())
      .lte("date", endDate.toISOString()),
  ]);

  const salesRows = (sales ?? []) as unknown as Array<{
    total: number;
    amountPaid: number;
    paymentMethod: string;
    items: Array<{ unitCost: number; quantity: number }>;
  }>;

  let totalRevenue = 0;
  let totalCost = 0;
  let cashCollected = 0;
  let mobileCollected = 0;
  let cardCollected = 0;
  let otherCollected = 0;
  let creditCollected = 0;

  for (const sale of salesRows) {
    totalRevenue += sale.total;
    for (const item of sale.items) totalCost += item.unitCost * item.quantity;
    switch (sale.paymentMethod) {
      case "ESPECES":
        cashCollected += sale.amountPaid;
        break;
      case "MOBILE_MONEY":
        mobileCollected += sale.amountPaid;
        break;
      case "CARTE":
        cardCollected += sale.amountPaid;
        break;
      case "CREDIT":
        creditCollected += sale.amountPaid;
        break;
      default:
        otherCollected += sale.amountPaid;
        break;
    }
  }

  const expensesTotal = (expenses ?? []).reduce((sum, e) => sum + (e.amount as number), 0);
  const grossMargin = totalRevenue - totalCost;
  const netMargin = grossMargin - expensesTotal;
  const marginRate = totalRevenue > 0 ? (netMargin / totalRevenue) * 100 : 0;
  // La caisse physique ne reçoit que les encaissements en espèces ; les dépenses
  // sont supposées payées depuis cette même caisse.
  const expectedCash = session.openingAmount + cashCollected - expensesTotal;

  return {
    salesCount: salesRows.length,
    totalRevenue,
    cashCollected,
    mobileCollected,
    cardCollected,
    otherCollected,
    creditCollected,
    grossMargin,
    expensesTotal,
    netMargin,
    marginRate,
    expectedCash,
  };
}

import "server-only";
import { supabase } from "@/lib/supabase";
import { cashedInAmount, cashedInMixedPortions } from "@/lib/sale-totals";

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
  sessionId: string;
  openingAmount: number;
  openedAt: Date;
  closedAt: Date | null;
}): Promise<SessionStats> {
  const endDate = session.closedAt ?? new Date();

  const salesQuery = () =>
    supabase
      .from("sales")
      .select(
        "total, amountPaid:amount_paid, paymentMethod:payment_method, cashPortion:cash_portion, mobilePortion:mobile_portion, items:sale_items(unitCost:unit_cost, quantity)"
      )
      .eq("business_id", session.businessId)
      .eq("location_id", session.locationId)
      .neq("status", "ANNULEE")
      .gte("created_at", session.openedAt.toISOString())
      .lte("created_at", endDate.toISOString());
  const expensesQuery = () =>
    supabase
      .from("expenses")
      .select("amount")
      .eq("business_id", session.businessId)
      .eq("location_id", session.locationId)
      .gte("date", session.openedAt.toISOString())
      .lte("date", endDate.toISOString());

  // "Caisse à deux" : deux sessions peuvent être ouvertes en même temps sur la
  // même boutique — chacune ne doit compter que SES propres ventes/dépenses
  // (session_id), sinon les deux caisses afficheraient deux fois le même
  // chiffre. session_id est nul sur les ventes/dépenses enregistrées avant
  // cette fonctionnalité, elles restent comptées (comportement historique).
  // Repli si la colonne n'est pas encore migrée côté base : ancien calcul par
  // simple fenêtre de temps.
  let salesResult = await salesQuery().or(`session_id.eq.${session.sessionId},session_id.is.null`);
  if (salesResult.error && /session_id/.test(salesResult.error.message)) {
    salesResult = await salesQuery();
  }
  let expensesResult = await expensesQuery().or(`session_id.eq.${session.sessionId},session_id.is.null`);
  if (expensesResult.error && /session_id/.test(expensesResult.error.message)) {
    expensesResult = await expensesQuery();
  }
  const sales = salesResult.data;
  const expenses = expensesResult.data;

  const salesRows = (sales ?? []) as unknown as Array<{
    total: number;
    amountPaid: number;
    paymentMethod: string;
    cashPortion: number | null;
    mobilePortion: number | null;
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
    // Montant reçu moins la monnaie rendue : seul l'argent gardé est dans le tiroir.
    const kept = cashedInAmount(sale.total, sale.amountPaid);
    switch (sale.paymentMethod) {
      case "ESPECES":
        cashCollected += kept;
        break;
      case "MOBILE_MONEY":
        mobileCollected += kept;
        break;
      case "CARTE":
        cardCollected += kept;
        break;
      case "CREDIT":
        creditCollected += kept;
        break;
      case "MIXTE": {
        // La part espèces d'un paiement mixte est bien dans le tiroir.
        if (sale.cashPortion === null && sale.mobilePortion === null) {
          otherCollected += kept;
          break;
        }
        const parts = cashedInMixedPortions(sale.total, sale.cashPortion ?? 0, sale.mobilePortion ?? 0);
        cashCollected += parts.cash;
        mobileCollected += parts.mobile;
        break;
      }
      default:
        otherCollected += kept;
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

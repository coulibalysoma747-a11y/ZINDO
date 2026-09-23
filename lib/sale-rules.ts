import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { formatMoney } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { sendPushToBusiness } from "@/lib/push";
import type { Role } from "@/lib/db-types";
import { CANCEL_REASON_REQUIRED } from "@/lib/sale-rules-constants";

/**
 * Règle « pas de vente à perte » : désactivée par défaut, à activer depuis
 * /admin/fonctionnalites (règle du memory "Feature rollout rule"). Quand elle
 * est active, seul un ADMIN peut vendre un article en dessous de son prix
 * d'achat ; les vendeurs sont bloqués.
 */
const BELOW_COST_FLAG = "block_sale_below_cost";

type Item = { productId: string; unitPrice: number; quantity: number; discount: number; multiplier?: number };
type Product = { name: string; purchasePrice: number };

export async function checkBelowCost(
  businessId: string,
  role: Role,
  items: Item[],
  productMap: Map<string, Product>
): Promise<string | null> {
  if (role === "ADMIN") return null;
  await registerFeatureFlag(
    BELOW_COST_FLAG,
    "Interdire la vente à perte",
    "Bloque toute vente d'un article en dessous de son prix d'achat, sauf pour un administrateur."
  );
  if (!(await isFeatureEnabled(BELOW_COST_FLAG, businessId))) return null;

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product || !product.purchasePrice) continue;
    const baseUnits = item.quantity * (item.multiplier ?? 1);
    if (baseUnits <= 0) continue;
    const netPerUnit = (item.unitPrice * item.quantity - item.discount) / baseUnits;
    if (netPerUnit < product.purchasePrice) {
      return `Vente à perte interdite pour "${product.name}" : prix ${formatMoney(Math.round(netPerUnit))} < prix d'achat ${formatMoney(product.purchasePrice)}. Demandez à un administrateur.`;
    }
  }
  return null;
}

/**
 * Règle « remise maximum » : désactivée par défaut. Quand elle est active,
 * un non-administrateur ne peut pas accorder plus de MAX_DISCOUNT_PERCENT %
 * de remise au total (remises par ligne + remise globale du panier).
 */
const MAX_DISCOUNT_FLAG = "max_discount_non_admin";
const MAX_DISCOUNT_PERCENT = 10;

export async function checkMaxDiscount(
  businessId: string,
  role: Role,
  items: Item[],
  globalDiscount: number
): Promise<string | null> {
  if (role === "ADMIN") return null;
  const gross = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discount = items.reduce((sum, i) => sum + i.discount, 0) + globalDiscount;
  if (gross <= 0 || discount <= 0) return null;

  await registerFeatureFlag(
    MAX_DISCOUNT_FLAG,
    `Remise maximum ${MAX_DISCOUNT_PERCENT} % pour les vendeurs`,
    `Bloque toute vente dont la remise totale dépasse ${MAX_DISCOUNT_PERCENT} %, sauf pour un administrateur.`
  );
  if (!(await isFeatureEnabled(MAX_DISCOUNT_FLAG, businessId))) return null;

  const percent = (discount / gross) * 100;
  if (percent > MAX_DISCOUNT_PERCENT) {
    return `Remise trop élevée (${Math.round(percent)} %) : maximum ${MAX_DISCOUNT_PERCENT} % pour un vendeur. Demandez à un administrateur.`;
  }
  return null;
}

/**
 * Règle « annulation encadrée » : désactivée par défaut. Quand elle est
 * active, seul un ADMIN peut annuler une vente, et il doit saisir un motif
 * (enregistré dans l'historique et sur le mouvement de stock).
 */
const CANCEL_RULES_FLAG = "sale_cancel_admin_with_reason";

export async function checkCancelRules(businessId: string, role: Role, reason?: string): Promise<string | null> {
  await registerFeatureFlag(
    CANCEL_RULES_FLAG,
    "Annulation de vente : admin + motif",
    "Seul un administrateur peut annuler une vente, et il doit indiquer un motif."
  );
  if (!(await isFeatureEnabled(CANCEL_RULES_FLAG, businessId))) return null;
  if (role !== "ADMIN") return "Seul un administrateur peut annuler une vente.";
  if (!reason?.trim()) return CANCEL_REASON_REQUIRED;
  return null;
}

/**
 * Règle « plafond de crédit » : désactivée par défaut. Quand elle est active,
 * la dette totale d'un client (ventes CREDIT/PARTIELLE non réglées + le reste
 * dû de la nouvelle vente) ne peut pas dépasser CREDIT_LIMIT, sauf pour un
 * ADMIN. Plus souple que le réglage « bloquer si dette en cours ».
 */
const CREDIT_LIMIT_FLAG = "customer_credit_limit";
const CREDIT_LIMIT = 50000;

export async function checkCreditLimit(
  businessId: string,
  role: Role,
  customerId: string | null | undefined,
  newDebt: number
): Promise<string | null> {
  if (role === "ADMIN" || !customerId || newDebt <= 0) return null;
  await registerFeatureFlag(
    CREDIT_LIMIT_FLAG,
    `Plafond de crédit client ${formatMoney(CREDIT_LIMIT)}`,
    `Bloque une vente à crédit si la dette totale du client dépasse ${formatMoney(CREDIT_LIMIT)}, sauf pour un administrateur.`
  );
  if (!(await isFeatureEnabled(CREDIT_LIMIT_FLAG, businessId))) return null;

  const { data: pastSales } = await supabase
    .from("sales")
    .select("total, amountPaid:amount_paid")
    .eq("business_id", businessId)
    .eq("customer_id", customerId)
    .in("status", ["CREDIT", "PARTIELLE"]);
  const debt = ((pastSales ?? []) as Array<{ total: number; amountPaid: number }>).reduce(
    (sum, s) => sum + Math.max(0, s.total - s.amountPaid),
    0
  );
  if (debt + newDebt > CREDIT_LIMIT) {
    return `Plafond de crédit dépassé : ce client doit déjà ${formatMoney(debt)} (maximum ${formatMoney(CREDIT_LIMIT)}). Demandez à un administrateur.`;
  }
  return null;
}

/**
 * Règle « alerte écart de caisse » : désactivée par défaut. Quand elle est
 * active, une notification est envoyée au commerce si l'écart constaté à la
 * clôture dépasse CASH_VARIANCE_ALERT (en plus ou en moins).
 */
const CASH_VARIANCE_FLAG = "cash_variance_alert";
const CASH_VARIANCE_ALERT = 5000;

export async function alertCashVariance(businessId: string, sessionId: string, variance: number, cashierName: string) {
  if (Math.abs(variance) < CASH_VARIANCE_ALERT) return;
  await registerFeatureFlag(
    CASH_VARIANCE_FLAG,
    `Alerte écart de caisse ≥ ${formatMoney(CASH_VARIANCE_ALERT)}`,
    `Envoie une notification quand l'écart constaté à la fermeture de caisse dépasse ${formatMoney(CASH_VARIANCE_ALERT)}.`
  );
  if (!(await isFeatureEnabled(CASH_VARIANCE_FLAG, businessId))) return;
  await sendPushToBusiness(businessId, {
    title: "⚠️ Écart de caisse",
    body: `${cashierName} a fermé la caisse avec un écart de ${variance > 0 ? "+" : ""}${formatMoney(variance)}`,
    link: `/ventes/session/${sessionId}`,
  });
}

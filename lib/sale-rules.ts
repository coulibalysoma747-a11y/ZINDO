import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { formatMoney } from "@/lib/format";
import type { Role } from "@/lib/db-types";

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

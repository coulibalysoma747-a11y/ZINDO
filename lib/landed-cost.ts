/**
 * Prix de revient d'un arrivage : répartit les frais (transport, douane…) sur les articles,
 * calcule le coût réel de chaque article, le prix de vente conseillé et le nouveau prix d'achat.
 * Calcul pur (aucun accès à la base) : utilisé par l'éditeur d'arrivage et par l'application des prix.
 */

export type ShareRule = "VALUE" | "WEIGHT" | "QUANTITY" | "VOLUME" | "MANUAL";

export type CostLine = {
  id: string;
  quantity: number;
  /** Prix payé au fournisseur, par unité, dans la devise de l'arrivage. */
  unitPrice: number;
  /** Poids d'une unité (kg), pour la règle « au poids ». */
  weight?: number | null;
  /** Volume d'une unité (m³), pour la règle « au volume ». */
  volume?: number | null;
};

export type CostExpense = {
  id: string;
  label: string;
  /** Montant du frais, dans la devise de l'arrivage. */
  amount: number;
  rule: ShareRule;
  /** Règle « à la main » : part de chaque ligne (identifiant de ligne → montant). */
  manual?: Record<string, number>;
};

export type MarginMode = "ADD_PERCENT" | "KEEP_PERCENT" | "ADD_AMOUNT" | "FIXED_PRICE";

export type MarginSetting = { mode: MarginMode; value: number };

/** Répartit `total` (entier) selon `weights` ; la somme des parts est exactement `total`. */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (weights.length === 0) return [];
  if (!(sum > 0)) {
    const even = weights.map(() => 0);
    even[0] = total;
    return even;
  }
  const exact = weights.map((w) => (total * w) / sum);
  const floors = exact.map((x) => Math.floor(x));
  let remainder = total - floors.reduce((s, x) => s + x, 0);
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] += 1;
    remainder -= 1;
  }
  return floors;
}

/** Règle effectivement appliquée : au poids ou au volume sans les données, on bascule sur la quantité. */
export function effectiveRule(rule: ShareRule, lines: CostLine[], expense?: CostExpense): ShareRule {
  if (rule === "WEIGHT" && !lines.every((l) => (l.weight ?? 0) > 0)) return "QUANTITY";
  if (rule === "VOLUME" && !lines.every((l) => (l.volume ?? 0) > 0)) return "QUANTITY";
  if (rule === "MANUAL") {
    const total = lines.reduce((s, l) => s + (expense?.manual?.[l.id] ?? 0), 0);
    if (!(total > 0)) return "QUANTITY";
  }
  return rule;
}

/** Part de chaque ligne pour un frais (même ordre que `lines`). */
export function shareExpense(expense: CostExpense, lines: CostLine[]): number[] {
  const amount = Math.round(expense.amount);
  const rule = effectiveRule(expense.rule, lines, expense);
  const weights = lines.map((l) => {
    switch (rule) {
      case "VALUE":
        return l.quantity * l.unitPrice;
      case "WEIGHT":
        return l.quantity * (l.weight ?? 0);
      case "VOLUME":
        return l.quantity * (l.volume ?? 0);
      case "MANUAL":
        return Math.max(0, expense.manual?.[l.id] ?? 0);
      default:
        return l.quantity;
    }
  });
  return allocate(amount, weights);
}

export type LineCost = {
  id: string;
  /** Marchandise seule (quantité × prix fournisseur), arrondie au franc. */
  goods: number;
  /** Part de chaque frais, dans l'ordre des frais. */
  shares: number[];
  /** Total des frais de la ligne. */
  expenses: number;
  /** Coût total de la ligne (marchandise + frais). */
  total: number;
  /** Prix de revient réel d'une unité. */
  unitCost: number;
};

export function computeLandedCosts(lines: CostLine[], expenses: CostExpense[]): LineCost[] {
  const perExpense = expenses.map((e) => shareExpense(e, lines));
  return lines.map((l, i) => {
    const goods = Math.round(l.quantity * l.unitPrice);
    const shares = perExpense.map((s) => s[i] ?? 0);
    const exp = shares.reduce((s, x) => s + x, 0);
    const total = goods + exp;
    return { id: l.id, goods, shares, expenses: exp, total, unitCost: l.quantity > 0 ? total / l.quantity : 0 };
  });
}

/** Arrondit au multiple de `step` le plus proche (step ≤ 1 : au franc). */
export function roundToStep(price: number, step: number): number {
  if (!(step > 1)) return Math.round(price);
  return Math.round(price / step) * step;
}

/** Prix de vente conseillé pour un coût unitaire. */
export function suggestedPrice(unitCost: number, margin: MarginSetting, roundingStep = 1): number {
  let price: number;
  switch (margin.mode) {
    case "ADD_PERCENT":
      price = unitCost * (1 + margin.value / 100);
      break;
    case "KEEP_PERCENT":
      price = margin.value >= 100 ? unitCost : unitCost / (1 - margin.value / 100);
      break;
    case "ADD_AMOUNT":
      price = unitCost + margin.value;
      break;
    default:
      price = margin.value;
  }
  return roundToStep(price, roundingStep);
}

/** Marge réelle d'un prix de vente : montant, % du coût et % du prix de vente. */
export function marginOf(unitCost: number, salePrice: number) {
  const amount = salePrice - unitCost;
  return {
    amount,
    onCost: unitCost > 0 ? (amount / unitCost) * 100 : 0,
    onSale: salePrice > 0 ? (amount / salePrice) * 100 : 0,
  };
}

/**
 * Nouveau prix d'achat d'un produit : soit le coût de l'arrivage seul, soit la moyenne
 * pondérée avec l'ancien stock (recommandé : la marge reste juste sur ce qui reste en rayon).
 */
export function newPurchasePrice(args: { oldQty: number; oldPrice: number; newQty: number; newUnitCost: number; averageWithOld: boolean }): number {
  const { oldQty, oldPrice, newQty, newUnitCost, averageWithOld } = args;
  if (!averageWithOld || oldQty <= 0) return Math.round(newUnitCost);
  return Math.round((oldQty * oldPrice + newQty * newUnitCost) / (oldQty + newQty));
}

/** Lignes à regarder avant d'appliquer : vente à perte, marge négative, forte hausse de prix. */
export function lineWarnings(args: { unitCost: number; salePrice: number; oldSalePrice?: number | null }): string[] {
  const out: string[] = [];
  const m = marginOf(args.unitCost, args.salePrice);
  if (args.salePrice < args.unitCost) out.push("Vendu à perte : le prix de vente est sous le prix de revient.");
  else if (m.amount === 0) out.push("Aucune marge sur cet article.");
  if (args.oldSalePrice && args.oldSalePrice > 0 && args.salePrice > args.oldSalePrice * 1.15) {
    out.push("Hausse de prix de plus de 15 % : vos clients habituels la remarqueront.");
  }
  return out;
}

/**
 * Prix de vente d'une ligne d'arrivage : le prix conseillé par la marge, sauf en mode « prix imposé »
 * où le prix reste celui du catalogue tant que l'utilisateur n'en fixe pas un autre sur la ligne.
 */
export function linePrice(unitCost: number, margin: MarginSetting, roundingStep: number, currentSalePrice: number): number {
  return margin.mode === "FIXED_PRICE" ? currentSalePrice : suggestedPrice(unitCost, margin, roundingStep);
}

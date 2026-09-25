/**
 * Réassort intelligent : calculs purs (aucun accès base), alimentés par
 * lib/actions/restock.ts. Trois questions par produit — faut-il recommander,
 * combien (arrondi au carton), et pourquoi (phrases lisibles par un
 * commerçant) — puis choix du fournisseur au meilleur coût, transport compris.
 */

export const RESTOCK_HISTORY_DAYS = 90;
const RECENT_WINDOW_DAYS = 30;
const DORMANT_DAYS = 60;
const NEW_PRODUCT_DAYS = 14;
export const DEFAULT_LEAD_TIME_DAYS = 7;
const SAFETY_RATIO = 0.2;
const SOON_DAYS = 15;
const STALE_PRICE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export type RestockUrgency = "URGENT" | "PREVOIR" | "OK" | "DORMANT";
export type RestockBasis = "HISTORIQUE" | "SEUIL";

export type EngineProduct = {
  id: string;
  name: string;
  reference: string;
  unit: string;
  minStock: number;
  unitsPerCarton: number | null;
  supplierId: string | null;
  salePrice: number;
  purchasePrice: number;
  createdAt: string;
  /** Stock actuel par boutique. */
  stocks: { locationId: string; quantity: number }[];
};

export type EngineMovement = {
  productId: string;
  locationId: string;
  direction: "IN" | "OUT";
  reason: string;
  quantity: number;
  oldStock: number;
  newStock: number;
  createdAt: string;
};

export type EngineSupplier = { id: string; name: string; leadTimeDays: number | null };

/** Une ligne d'achat passé (historique des prix par fournisseur). */
export type EnginePurchaseLine = {
  productId: string;
  supplierId: string;
  purchaseId: string;
  unitPrice: number;
  quantity: number;
  transportCost: number;
  createdAt: string;
};

export type SupplierOffer = {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  priceDate: string;
  stale: boolean;
  leadTimeDays: number;
};

export type SmartRestockRow = {
  productId: string;
  name: string;
  reference: string;
  unit: string;
  unitsPerCarton: number | null;
  currentStock: number;
  minStock: number;
  onOrder: number;
  /** Ventes moyennes par jour (jours de rupture exclus). */
  dailySales: number;
  daysLeft: number | null;
  urgency: RestockUrgency;
  basis: RestockBasis;
  suggestedQty: number;
  suggestedCartons: number | null;
  supplierId: string | null;
  supplierName: string | null;
  leadTimeDays: number;
  offers: SupplierOffer[];
  /** Prix unitaire estimé (dernier prix connu du fournisseur choisi, sinon prix d'achat de la fiche). */
  estimatedUnitPrice: number;
  salePrice: number;
  reasons: string[];
  supplierReason: string | null;
  warning: string | null;
  inBudget: boolean;
};

export type SupplierGroup = {
  supplierId: string | null;
  supplierName: string;
  lineCount: number;
  subtotal: number;
  estimatedTransport: number;
};

export type SmartRestockResult = {
  rows: SmartRestockRow[];
  dormant: SmartRestockRow[];
  groups: SupplierGroup[];
  coverageDays: number;
  budget: number | null;
  totalEstimated: number;
};

function fmtQty(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(n);
}

/** Accord simple de l'unité ("pièce" → "pièces"), laissé tel quel pour les abréviations (kg, L...). */
function unitLabel(unit: string, n: number) {
  if (n < 2 || unit.length <= 3 || /[sx]$/i.test(unit) || !/^[\p{L} ]+$/u.test(unit)) return unit;
  return `${unit}s`;
}

function fmtMoney(n: number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n))} FCFA`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR");
}

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function dayIndex(iso: string, windowStart: number) {
  return Math.floor((new Date(iso).getTime() - windowStart) / DAY_MS);
}

type SalesStats = {
  dailySales: number;
  inStockDays: number;
  outOfStockDays: number;
  soldLastDormantWindow: number;
  cappedNote: string | null;
  enoughHistory: boolean;
  ageDays: number;
};

/**
 * Vitesse de vente sur 90 jours, 30 derniers jours comptés double. Les jours
 * où le produit était en rupture ne comptent pas (sinon la demande serait
 * sous-estimée), et une vente exceptionnelle est plafonnée à 5 fois la vente
 * habituelle pour ne pas fausser la moyenne.
 */
function computeSalesStats(product: EngineProduct, unsorted: EngineMovement[], now: number): SalesStats {
  const movements = [...unsorted].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const windowStart = now - RESTOCK_HISTORY_DAYS * DAY_MS;
  const createdAt = new Date(product.createdAt).getTime();
  const firstDay = Math.max(0, Math.floor((createdAt - windowStart) / DAY_MS));
  const ageDays = Math.floor((now - createdAt) / DAY_MS);

  const sales = movements.filter((m) => m.reason === "VENTE" && m.direction === "OUT");
  const returns = movements.filter((m) => m.reason === "RETOUR_CLIENT" && m.direction === "IN");

  let cap = Infinity;
  let cappedNote: string | null = null;
  if (sales.length >= 4) {
    const m = median(sales.map((s) => s.quantity));
    cap = Math.max(Math.ceil(m * 5), 3);
    const biggest = sales.reduce((max, s) => Math.max(max, s.quantity), 0);
    if (biggest > cap) {
      cappedNote = `Une vente exceptionnelle de ${fmtQty(biggest)} ${unitLabel(product.unit, biggest)} a été ramenée à ${fmtQty(cap)} dans le calcul, pour ne pas fausser la moyenne.`;
    }
  }

  const soldPerDay = new Array<number>(RESTOCK_HISTORY_DAYS).fill(0);
  for (const s of sales) {
    const d = dayIndex(s.createdAt, windowStart);
    if (d >= 0 && d < RESTOCK_HISTORY_DAYS) soldPerDay[d] += Math.min(s.quantity, cap);
  }
  for (const r of returns) {
    const d = dayIndex(r.createdAt, windowStart);
    if (d >= 0 && d < RESTOCK_HISTORY_DAYS) soldPerDay[d] = Math.max(0, soldPerDay[d] - r.quantity);
  }

  // Stock total (toutes boutiques) en début de chaque journée, reconstitué à
  // partir des mouvements : l'ancien stock du premier mouvement d'une boutique
  // donne son état au début de la fenêtre, une boutique sans mouvement est
  // restée à son stock actuel.
  const byLocation = new Map<string, EngineMovement[]>();
  for (const m of movements) {
    const list = byLocation.get(m.locationId) ?? [];
    list.push(m);
    byLocation.set(m.locationId, list);
  }
  const locStock = new Map<string, number>();
  for (const s of product.stocks) locStock.set(s.locationId, s.quantity);
  for (const [loc, list] of byLocation) locStock.set(loc, list[0].oldStock);

  const events = movements;
  let ei = 0;
  let inStockDays = 0;
  let outOfStockDays = 0;
  let weightedSold = 0;
  let weightedDays = 0;
  const recentStart = RESTOCK_HISTORY_DAYS - RECENT_WINDOW_DAYS;

  for (let d = 0; d < RESTOCK_HISTORY_DAYS; d++) {
    let startTotal = 0;
    for (const q of locStock.values()) startTotal += q;
    while (ei < events.length && dayIndex(events[ei].createdAt, windowStart) <= d) {
      locStock.set(events[ei].locationId, events[ei].newStock);
      ei++;
    }
    if (d < firstDay) continue;
    const available = startTotal > 0 || soldPerDay[d] > 0;
    if (!available) {
      outOfStockDays++;
      continue;
    }
    inStockDays++;
    const w = d >= recentStart ? 2 : 1;
    weightedSold += soldPerDay[d] * w;
    weightedDays += w;
  }

  const soldLastDormantWindow = soldPerDay.slice(RESTOCK_HISTORY_DAYS - DORMANT_DAYS).reduce((a, b) => a + b, 0);

  return {
    dailySales: weightedDays > 0 ? weightedSold / weightedDays : 0,
    inStockDays,
    outOfStockDays,
    soldLastDormantWindow,
    cappedNote,
    enoughHistory: ageDays >= NEW_PRODUCT_DAYS && inStockDays >= 7,
    ageDays,
  };
}

function roundToCarton(qty: number, unitsPerCarton: number | null) {
  if (qty <= 0) return { qty: 0, cartons: unitsPerCarton ? 0 : null };
  if (!unitsPerCarton || unitsPerCarton <= 1) return { qty: Math.ceil(qty), cartons: null };
  const cartons = Math.ceil(qty / unitsPerCarton);
  return { qty: cartons * unitsPerCarton, cartons };
}

function describeSpeed(daily: number, unit: string) {
  if (daily * 7 >= 1) return `Vous vendez environ ${fmtQty(daily * 7)} ${unitLabel(unit, daily * 7)} par semaine.`;
  return `Vous vendez environ ${fmtQty(daily * 30)} ${unitLabel(unit, daily * 30)} par mois.`;
}

export function computeSmartRestock(input: {
  products: EngineProduct[];
  movements: EngineMovement[];
  suppliers: EngineSupplier[];
  purchaseLines: EnginePurchaseLine[];
  onOrder: Map<string, number>;
  coverageDays: number;
  budget: number | null;
  now?: number;
}): SmartRestockResult {
  const now = input.now ?? Date.now();
  const coverage = input.coverageDays;
  const supplierById = new Map(input.suppliers.map((s) => [s.id, s]));
  const leadTime = (supplierId: string | null) =>
    (supplierId && supplierById.get(supplierId)?.leadTimeDays) || DEFAULT_LEAD_TIME_DAYS;

  const movementsByProduct = new Map<string, EngineMovement[]>();
  for (const m of input.movements) {
    const list = movementsByProduct.get(m.productId) ?? [];
    list.push(m);
    movementsByProduct.set(m.productId, list);
  }

  // Dernier prix connu par produit × fournisseur, et transport moyen par
  // commande pour chaque fournisseur.
  const offersByProduct = new Map<string, Map<string, SupplierOffer>>();
  const transportByPurchase = new Map<string, { supplierId: string; cost: number }>();
  for (const line of [...input.purchaseLines].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    transportByPurchase.set(line.purchaseId, { supplierId: line.supplierId, cost: line.transportCost });
    const supplier = supplierById.get(line.supplierId);
    if (!supplier) continue;
    const offers = offersByProduct.get(line.productId) ?? new Map<string, SupplierOffer>();
    offers.set(line.supplierId, {
      supplierId: line.supplierId,
      supplierName: supplier.name,
      unitPrice: line.unitPrice,
      priceDate: line.createdAt,
      stale: now - new Date(line.createdAt).getTime() > STALE_PRICE_DAYS * DAY_MS,
      leadTimeDays: supplier.leadTimeDays || DEFAULT_LEAD_TIME_DAYS,
    });
    offersByProduct.set(line.productId, offers);
  }
  const transportTotals = new Map<string, { sum: number; count: number }>();
  for (const { supplierId, cost } of transportByPurchase.values()) {
    const t = transportTotals.get(supplierId) ?? { sum: 0, count: 0 };
    t.sum += cost;
    t.count++;
    transportTotals.set(supplierId, t);
  }
  const avgTransport = (supplierId: string | null) => {
    if (!supplierId) return 0;
    const t = transportTotals.get(supplierId);
    return t && t.count > 0 ? t.sum / t.count : 0;
  };

  const rows: SmartRestockRow[] = [];
  const dormant: SmartRestockRow[] = [];

  for (const p of input.products) {
    const currentStock = p.stocks.reduce((s, st) => s + st.quantity, 0);
    const onOrder = input.onOrder.get(p.id) ?? 0;
    const stats = computeSalesStats(p, movementsByProduct.get(p.id) ?? [], now);
    const offers = [...(offersByProduct.get(p.id)?.values() ?? [])].sort((a, b) => a.unitPrice - b.unitPrice);
    const L = leadTime(p.supplierId);
    const reasons: string[] = [];
    let urgency: RestockUrgency;
    let basis: RestockBasis;
    let need: number;
    let daysLeft: number | null = null;

    const isDormant =
      stats.ageDays >= DORMANT_DAYS && stats.soldLastDormantWindow === 0 && stats.inStockDays >= 30 && currentStock > 0;

    if (isDormant) {
      if (currentStock > p.minStock) continue;
      dormant.push({
        ...baseRow(p, currentStock, onOrder, stats.dailySales, null, "DORMANT", "HISTORIQUE", L, offers),
        reasons: [
          `Aucune vente depuis au moins ${DORMANT_DAYS} jours alors que le produit était en stock.`,
          "Nous vous conseillons de ne pas le recommander pour l'instant.",
        ],
      });
      continue;
    }

    if (stats.enoughHistory && stats.dailySales > 0) {
      basis = "HISTORIQUE";
      const v = stats.dailySales;
      daysLeft = (currentStock + onOrder) / v;
      const target = v * (L + coverage) * (1 + SAFETY_RATIO);
      need = target - currentStock - onOrder;
      if (currentStock <= p.minStock) need = Math.max(need, p.minStock * 2 - currentStock - onOrder);
      urgency =
        daysLeft < L ? "URGENT" : daysLeft < L + SOON_DAYS || currentStock <= p.minStock ? "PREVOIR" : "OK";

      reasons.push(describeSpeed(v, p.unit));
      const left = Math.floor(daysLeft);
      if (urgency === "URGENT") {
        reasons.push(
          left <= 0
            ? `Vous êtes déjà en rupture, et la livraison prend environ ${L} jours.`
            : `Votre stock sera épuisé dans environ ${left} jour${left > 1 ? "s" : ""}, avant la livraison prévue dans ${L} jours.`
        );
      } else if (urgency === "PREVOIR") {
        reasons.push(`Votre stock tiendra environ ${left} jours ; la livraison prend environ ${L} jours.`);
      }
      if (stats.outOfStockDays > 0) {
        reasons.push(
          `${stats.outOfStockDays} jour${stats.outOfStockDays > 1 ? "s" : ""} de rupture sur les ${RESTOCK_HISTORY_DAYS} derniers jours n'ont pas été comptés.`
        );
      }
      if (stats.cappedNote) reasons.push(stats.cappedNote);
    } else {
      // Produit récent ou sans vente exploitable : on se base sur le stock minimum.
      basis = "SEUIL";
      need = currentStock <= p.minStock ? Math.max(p.minStock * 2 - currentStock - onOrder, p.minStock || 1) : 0;
      urgency = currentStock <= 0 ? "URGENT" : currentStock <= p.minStock ? "PREVOIR" : "OK";
      reasons.push(
        stats.ageDays < NEW_PRODUCT_DAYS
          ? "Produit récent : pas encore assez de ventes, la suggestion se base sur le stock minimum."
          : "Pas assez de ventes récentes : la suggestion se base sur le stock minimum."
      );
      if (currentStock <= p.minStock) reasons.push(`Stock actuel ${currentStock}, stock minimum ${p.minStock}.`);
    }

    if (urgency === "OK" || need <= 0) continue;
    if (onOrder > 0) reasons.push(`${fmtQty(onOrder)} ${unitLabel(p.unit, onOrder)} déjà en commande ont été déduits.`);

    const rounded = roundToCarton(need, p.unitsPerCarton);
    if (rounded.qty <= 0) continue;
    if (rounded.cartons != null) {
      reasons.push(
        basis === "HISTORIQUE"
          ? `${rounded.cartons} carton${rounded.cartons > 1 ? "s" : ""} de ${p.unitsPerCarton} (${rounded.qty} ${unitLabel(p.unit, rounded.qty)}) couvrent environ ${coverage} jours de ventes.`
          : `Arrondi à ${rounded.cartons} carton${rounded.cartons > 1 ? "s" : ""} de ${p.unitsPerCarton}.`
      );
    } else if (basis === "HISTORIQUE") {
      reasons.push(`${rounded.qty} ${unitLabel(p.unit, rounded.qty)} couvrent environ ${coverage} jours de ventes.`);
    }

    rows.push({
      ...baseRow(p, currentStock, onOrder, stats.dailySales, daysLeft, urgency, basis, L, offers),
      suggestedQty: rounded.qty,
      suggestedCartons: rounded.cartons,
      reasons,
    });
  }

  assignSuppliers(rows, supplierById, avgTransport);

  // Délai du fournisseur retenu : alerte si le produit urgent risque la
  // rupture avant sa livraison.
  for (const r of rows) {
    r.leadTimeDays = leadTime(r.supplierId);
    if (r.urgency === "URGENT" && r.daysLeft != null && r.daysLeft < r.leadTimeDays && r.daysLeft > 0) {
      const faster = r.offers.find((o) => o.leadTimeDays <= r.daysLeft! && o.supplierId !== r.supplierId);
      r.warning = faster
        ? `Attention : ${r.supplierName} livre en ${r.leadTimeDays} jours, votre stock tient ${Math.floor(r.daysLeft)} jours. ${faster.supplierName} livre plus vite (${faster.leadTimeDays} jours).`
        : `Attention : livraison en ${r.leadTimeDays} jours, votre stock tient ${Math.floor(r.daysLeft)} jours — commandez rapidement.`;
    }
  }

  applyBudget(rows, input.budget, avgTransport);

  const urgencyRank: Record<RestockUrgency, number> = { URGENT: 0, PREVOIR: 1, OK: 2, DORMANT: 3 };
  rows.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  const groupMap = new Map<string, SupplierGroup>();
  for (const r of rows) {
    if (!r.inBudget) continue;
    const key = r.supplierId ?? "";
    const g = groupMap.get(key) ?? {
      supplierId: r.supplierId,
      supplierName: r.supplierName ?? "Sans fournisseur",
      lineCount: 0,
      subtotal: 0,
      estimatedTransport: avgTransport(r.supplierId),
    };
    g.lineCount++;
    g.subtotal += r.suggestedQty * r.estimatedUnitPrice;
    groupMap.set(key, g);
  }
  const groups = [...groupMap.values()];
  const totalEstimated = groups.reduce((s, g) => s + g.subtotal + g.estimatedTransport, 0);

  return { rows, dormant, groups, coverageDays: coverage, budget: input.budget, totalEstimated };
}

function baseRow(
  p: EngineProduct,
  currentStock: number,
  onOrder: number,
  dailySales: number,
  daysLeft: number | null,
  urgency: RestockUrgency,
  basis: RestockBasis,
  leadTimeDays: number,
  offers: SupplierOffer[]
): SmartRestockRow {
  return {
    productId: p.id,
    name: p.name,
    reference: p.reference,
    unit: p.unit,
    unitsPerCarton: p.unitsPerCarton,
    currentStock,
    minStock: p.minStock,
    onOrder,
    dailySales,
    daysLeft,
    urgency,
    basis,
    suggestedQty: 0,
    suggestedCartons: null,
    supplierId: p.supplierId,
    supplierName: null,
    leadTimeDays,
    offers,
    estimatedUnitPrice: p.purchasePrice,
    salePrice: p.salePrice,
    reasons: [],
    supplierReason: null,
    warning: null,
    inBudget: true,
  };
}

/**
 * Choix du fournisseur : on part du moins cher pour chaque produit, puis on
 * essaie de supprimer un fournisseur en reportant ses produits chez un
 * fournisseur déjà retenu — accepté si l'économie de transport dépasse le
 * surcoût des prix. Évite cinq petites commandes et cinq transports.
 */
function assignSuppliers(
  rows: SmartRestockRow[],
  supplierById: Map<string, EngineSupplier>,
  avgTransport: (id: string | null) => number
) {
  const usualSupplier = new Map(rows.map((r) => [r.productId, r.supplierId]));
  // Point de départ : le meilleur coût rendu boutique (prix × quantité +
  // transport d'une commande), pas seulement le prix affiché.
  const landedCost = (r: SmartRestockRow, o: SupplierOffer) => o.unitPrice * r.suggestedQty + avgTransport(o.supplierId);
  for (const r of rows) {
    if (r.offers.length === 0) continue;
    const best = r.offers.reduce((a, b) => (landedCost(r, b) < landedCost(r, a) ? b : a));
    r.supplierId = best.supplierId;
    const cheapest = r.offers[0];
    if (best.supplierId !== cheapest.supplierId) {
      r.supplierReason = `${best.supplierName} revient moins cher une fois la marchandise en boutique : ${cheapest.supplierName} est à ${fmtMoney(cheapest.unitPrice)} au lieu de ${fmtMoney(best.unitPrice)}, mais son transport (environ ${fmtMoney(avgTransport(cheapest.supplierId))} contre ${fmtMoney(avgTransport(best.supplierId))}) fait perdre ${fmtMoney(landedCost(r, cheapest) - landedCost(r, best))} sur cette commande.`;
    }
  }

  const priceAt = (r: SmartRestockRow, supplierId: string) =>
    r.offers.find((o) => o.supplierId === supplierId)?.unitPrice;

  let improved = true;
  while (improved) {
    improved = false;
    const used = new Set(rows.map((r) => r.supplierId).filter((id): id is string => !!id));
    for (const s of used) {
      const items = rows.filter((r) => r.supplierId === s);
      const moves: { row: SmartRestockRow; to: string; extra: number }[] = [];
      let possible = true;
      for (const r of items) {
        const current = priceAt(r, s);
        let best: { to: string; price: number } | null = null;
        for (const o of r.offers) {
          if (o.supplierId === s || !used.has(o.supplierId)) continue;
          if (!best || o.unitPrice < best.price) best = { to: o.supplierId, price: o.unitPrice };
        }
        if (current == null || !best) {
          possible = false;
          break;
        }
        moves.push({ row: r, to: best.to, extra: (best.price - current) * r.suggestedQty });
      }
      if (!possible || moves.length === 0) continue;
      const extraCost = moves.reduce((sum, m) => sum + m.extra, 0);
      const savedTransport = avgTransport(s);
      if (savedTransport > extraCost) {
        for (const m of moves) {
          m.row.supplierId = m.to;
          const cheaper = supplierById.get(s)?.name ?? "un autre fournisseur";
          m.row.supplierReason = `Regroupé chez ${supplierById.get(m.to)?.name} : ${cheaper} est un peu moins cher, mais une commande séparée coûterait un transport d'environ ${fmtMoney(savedTransport)}.`;
        }
        improved = true;
        break;
      }
    }
  }

  for (const r of rows) {
    r.supplierName = r.supplierId ? supplierById.get(r.supplierId)?.name ?? null : null;
    const chosen = r.offers.find((o) => o.supplierId === r.supplierId);
    if (chosen) r.estimatedUnitPrice = chosen.unitPrice;
    if (!r.supplierReason) {
      if (chosen && r.offers.length > 1) {
        r.supplierReason = `${chosen.supplierName} est le moins cher : ${fmtMoney(chosen.unitPrice)} par ${r.unit} (dernier achat du ${fmtDate(chosen.priceDate)}).`;
        const usual = usualSupplier.get(r.productId);
        const usualOffer = r.offers.find((o) => o.supplierId === usual);
        if (usualOffer && usual !== r.supplierId && usualOffer.unitPrice > chosen.unitPrice) {
          r.supplierReason += ` Économie estimée : ${fmtMoney((usualOffer.unitPrice - chosen.unitPrice) * r.suggestedQty)} par rapport à ${usualOffer.supplierName}.`;
        }
      } else if (chosen) {
        r.supplierReason = `Dernier prix connu chez ${chosen.supplierName} : ${fmtMoney(chosen.unitPrice)} (${fmtDate(chosen.priceDate)}).`;
      } else if (r.supplierName) {
        r.supplierReason = `Fournisseur habituel du produit ; aucun achat récent pour comparer les prix.`;
      }
    }
    if (chosen?.stale) r.supplierReason += " Prix datant de plus de 3 mois : à confirmer avec le fournisseur.";
  }
}

/**
 * Budget : les produits urgents d'abord, puis ceux qui rapportent le plus de
 * marge par unité. Une ligne qui ne rentre pas entièrement est réduite au
 * nombre de cartons qui tient encore dans le budget.
 */
function applyBudget(rows: SmartRestockRow[], budget: number | null, avgTransport: (id: string | null) => number) {
  if (!budget || budget <= 0) return;
  const rank: Record<RestockUrgency, number> = { URGENT: 0, PREVOIR: 1, OK: 2, DORMANT: 3 };
  const ordered = [...rows].sort(
    (a, b) =>
      rank[a.urgency] - rank[b.urgency] ||
      b.salePrice - b.estimatedUnitPrice - (a.salePrice - a.estimatedUnitPrice)
  );
  let remaining = budget;
  const suppliersPaid = new Set<string>();
  for (const r of ordered) {
    const transport = r.supplierId && !suppliersPaid.has(r.supplierId) ? avgTransport(r.supplierId) : 0;
    const cost = r.suggestedQty * r.estimatedUnitPrice + transport;
    if (cost <= remaining) {
      remaining -= cost;
      if (r.supplierId) suppliersPaid.add(r.supplierId);
      continue;
    }
    const step = r.unitsPerCarton && r.unitsPerCarton > 1 ? r.unitsPerCarton : 1;
    const affordableSteps = r.estimatedUnitPrice > 0 ? Math.floor((remaining - transport) / (r.estimatedUnitPrice * step)) : 0;
    if (affordableSteps >= 1) {
      r.suggestedQty = affordableSteps * step;
      if (r.suggestedCartons != null) r.suggestedCartons = affordableSteps;
      r.reasons.push("Quantité réduite pour respecter votre budget.");
      remaining -= r.suggestedQty * r.estimatedUnitPrice + transport;
      if (r.supplierId) suppliersPaid.add(r.supplierId);
    } else {
      r.inBudget = false;
      r.reasons.push("Hors budget : à commander plus tard.");
    }
  }
}

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { adjustStock } from "@/lib/stock";
import { getArrival, getPriceHistory, type PriceHistoryRow } from "@/lib/cost-arrivals-data";
import { computeLandedCosts, linePrice, newPurchasePrice, type CostExpense, type CostLine } from "@/lib/landed-cost";

export type CostResult = { error?: string; success?: string; id?: string };

const RULES = ["VALUE", "WEIGHT", "QUANTITY", "VOLUME", "MANUAL"] as const;
const MARGIN_MODES = ["ADD_PERCENT", "KEEP_PERCENT", "ADD_AMOUNT", "FIXED_PRICE"] as const;

async function user() {
  return requirePermission(PERMISSIONS.COST_PRICE_MANAGE);
}

function refresh(id?: string) {
  revalidatePath("/prix-de-revient");
  if (id) revalidatePath(`/prix-de-revient/${id}`);
}

/** Charge un arrivage du commerce et vérifie qu'il est encore un brouillon. */
async function draftOf(businessId: string, id: string): Promise<{ status: string; locationId: string } | { error: string }> {
  const { data } = await supabase.from("cost_arrivals").select("status, locationId:location_id").eq("id", id).eq("business_id", businessId).maybeSingle();
  if (!data) return { error: "Arrivage introuvable" };
  if (data.status !== "BROUILLON") return { error: "Cet arrivage est verrouillé : il n'est plus modifiable." };
  return data as { status: string; locationId: string };
}

// ---------------------------------------------------------------------------
// Arrivage : création, réglages, copie, suppression
// ---------------------------------------------------------------------------
const createSchema = z.object({
  name: z.string().trim().min(1, "Donnez un nom à l'arrivage").max(120),
  reference: z.string().trim().max(60).optional(),
  arrivalDate: z.string().min(1, "Choisissez une date"),
  supplierId: z.string().optional(),
  locationId: z.string().min(1, "Choisissez la boutique qui reçoit"),
  stockMode: z.enum(["ENTRER_STOCK", "PRIX_SEULEMENT"]),
});

export async function createArrivalAction(formData: FormData): Promise<CostResult> {
  const u = await user();
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    reference: formData.get("reference") || undefined,
    arrivalDate: formData.get("arrivalDate"),
    supplierId: formData.get("supplierId") || undefined,
    locationId: formData.get("locationId"),
    stockMode: formData.get("stockMode") || "PRIX_SEULEMENT",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  const d = parsed.data;

  const { data: location } = await supabase.from("locations").select("id").eq("id", d.locationId).eq("business_id", u.businessId).maybeSingle();
  if (!location) return { error: "Boutique introuvable" };
  if (d.supplierId) {
    const { data: supplier } = await supabase.from("suppliers").select("id").eq("id", d.supplierId).eq("business_id", u.businessId).maybeSingle();
    if (!supplier) return { error: "Fournisseur introuvable" };
  }

  const { data, error } = await supabase
    .from("cost_arrivals")
    .insert({
      business_id: u.businessId,
      location_id: d.locationId,
      supplier_id: d.supplierId ?? null,
      name: d.name,
      reference: d.reference ?? null,
      arrival_date: d.arrivalDate,
      stock_mode: d.stockMode,
      created_by: u.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[createArrivalAction] Échec :", error?.message);
    return { error: "Impossible de créer l'arrivage" };
  }
  await logAction({ businessId: u.businessId, userId: u.id, action: "CREATE", entity: "CostArrival", entityId: data.id as string, details: d.name });
  refresh();
  return { id: data.id as string };
}

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  reference: z.string().trim().max(60).nullable().optional(),
  arrivalDate: z.string().min(1).optional(),
  supplierId: z.string().nullable().optional(),
  stockMode: z.enum(["ENTRER_STOCK", "PRIX_SEULEMENT"]).optional(),
  averageWithOld: z.boolean().optional(),
  marginMode: z.enum(MARGIN_MODES).optional(),
  marginValue: z.number().min(0).max(1_000_000_000).optional(),
  roundingStep: z.number().min(1).max(100000).optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  fxRate: z.number().gt(0).max(1_000_000).optional(),
});

export async function updateArrivalAction(id: string, patch: z.input<typeof settingsSchema>): Promise<CostResult> {
  const u = await user();
  const draft = await draftOf(u.businessId, id);
  if ("error" in draft) return { error: draft.error };
  const parsed = settingsSchema.safeParse(patch);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Réglage invalide" };
  const p = parsed.data;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (p.name !== undefined) update.name = p.name;
  if (p.reference !== undefined) update.reference = p.reference;
  if (p.arrivalDate !== undefined) update.arrival_date = p.arrivalDate;
  if (p.supplierId !== undefined) update.supplier_id = p.supplierId;
  if (p.stockMode !== undefined) update.stock_mode = p.stockMode;
  if (p.averageWithOld !== undefined) update.average_with_old = p.averageWithOld;
  if (p.marginMode !== undefined) update.margin_mode = p.marginMode;
  if (p.marginValue !== undefined) update.margin_value = p.marginValue;
  if (p.roundingStep !== undefined) update.rounding_step = p.roundingStep;
  if (p.currency !== undefined) update.currency = p.currency;
  if (p.fxRate !== undefined) update.fx_rate = p.fxRate;
  const { error } = await supabase.from("cost_arrivals").update(update).eq("id", id).eq("business_id", u.businessId);
  if (error) {
    console.error("[updateArrivalAction] Échec :", error.message);
    return { error: "Impossible d'enregistrer le réglage" };
  }
  refresh(id);
  return { success: "Enregistré" };
}

export async function deleteArrivalAction(id: string): Promise<CostResult> {
  const u = await user();
  const draft = await draftOf(u.businessId, id);
  if ("error" in draft) return { error: draft.error };
  const { error } = await supabase.from("cost_arrivals").delete().eq("id", id).eq("business_id", u.businessId).eq("status", "BROUILLON");
  if (error) return { error: "Impossible de supprimer l'arrivage" };
  await logAction({ businessId: u.businessId, userId: u.id, action: "DELETE", entity: "CostArrival", entityId: id });
  refresh();
  return { success: "Arrivage supprimé" };
}

/** « Copier » : refait le même arrivage (mêmes articles, mêmes frais) en brouillon ; on ne change que les montants. */
export async function duplicateArrivalAction(id: string): Promise<CostResult> {
  const u = await user();
  const found = await getArrival(u.businessId, id);
  if (!found) return { error: "Arrivage introuvable" };
  const a = found.arrival;
  const { data, error } = await supabase
    .from("cost_arrivals")
    .insert({
      business_id: u.businessId,
      location_id: a.locationId,
      supplier_id: a.supplierId,
      name: `${a.name} (copie)`,
      reference: null,
      stock_mode: a.stockMode,
      average_with_old: a.averageWithOld,
      margin_mode: a.marginMode,
      margin_value: a.marginValue,
      rounding_step: a.roundingStep,
      currency: a.currency,
      fx_rate: a.fxRate,
      created_by: u.id,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Impossible de copier l'arrivage" };
  const newId = data.id as string;
  if (found.items.length > 0) {
    await supabase.from("cost_arrival_items").insert(
      found.items.map((i, index) => ({
        business_id: u.businessId,
        arrival_id: newId,
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        weight: i.weight,
        volume: i.volume,
        apply_sale_price: i.applySalePrice,
        position: index,
      }))
    );
  }
  if (found.expenses.length > 0) {
    await supabase.from("cost_arrival_expenses").insert(
      found.expenses.map((e, index) => ({
        business_id: u.businessId,
        arrival_id: newId,
        label: e.label,
        amount: e.amount,
        rule: e.rule,
        position: index,
      }))
    );
  }
  refresh();
  return { id: newId };
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------
const itemSchema = z.object({
  quantity: z.number().positive("Quantité invalide").max(1_000_000_000),
  unitPrice: z.number().min(0, "Prix invalide").max(1_000_000_000),
  weight: z.number().min(0).max(1_000_000).nullable().optional(),
  volume: z.number().min(0).max(1_000_000).nullable().optional(),
  applySalePrice: z.boolean().optional(),
  salePriceOverride: z.number().min(0).max(1_000_000_000).nullable().optional(),
});

export async function addArrivalItemAction(arrivalId: string, productId: string, input: { quantity: number; unitPrice: number }): Promise<CostResult> {
  const u = await user();
  const draft = await draftOf(u.businessId, arrivalId);
  if ("error" in draft) return { error: draft.error };
  const parsed = itemSchema.pick({ quantity: true, unitPrice: true }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  const { data: product } = await supabase.from("products").select("id").eq("id", productId).eq("business_id", u.businessId).maybeSingle();
  if (!product) return { error: "Produit introuvable" };
  const { count } = await supabase.from("cost_arrival_items").select("id", { count: "exact", head: true }).eq("arrival_id", arrivalId);
  const { error } = await supabase.from("cost_arrival_items").insert({
    business_id: u.businessId,
    arrival_id: arrivalId,
    product_id: productId,
    quantity: parsed.data.quantity,
    unit_price: parsed.data.unitPrice,
    position: count ?? 0,
  });
  if (error) {
    return { error: error.code === "23505" ? "Ce produit est déjà dans l'arrivage." : "Impossible d'ajouter le produit" };
  }
  refresh(arrivalId);
  return { success: "Produit ajouté" };
}

export async function updateArrivalItemAction(arrivalId: string, itemId: string, patch: Partial<z.input<typeof itemSchema>>): Promise<CostResult> {
  const u = await user();
  const draft = await draftOf(u.businessId, arrivalId);
  if ("error" in draft) return { error: draft.error };
  const parsed = itemSchema.partial().safeParse(patch);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  const p = parsed.data;
  const update: Record<string, unknown> = {};
  if (p.quantity !== undefined) update.quantity = p.quantity;
  if (p.unitPrice !== undefined) update.unit_price = p.unitPrice;
  if (p.weight !== undefined) update.weight = p.weight && p.weight > 0 ? p.weight : null;
  if (p.volume !== undefined) update.volume = p.volume && p.volume > 0 ? p.volume : null;
  if (p.applySalePrice !== undefined) update.apply_sale_price = p.applySalePrice;
  if (p.salePriceOverride !== undefined) update.sale_price_override = p.salePriceOverride;
  if (Object.keys(update).length === 0) return { success: "Rien à changer" };
  const { error } = await supabase.from("cost_arrival_items").update(update).eq("id", itemId).eq("arrival_id", arrivalId).eq("business_id", u.businessId);
  if (error) return { error: "Impossible d'enregistrer la ligne" };
  refresh(arrivalId);
  return { success: "Enregistré" };
}

export async function removeArrivalItemAction(arrivalId: string, itemId: string): Promise<CostResult> {
  const u = await user();
  const draft = await draftOf(u.businessId, arrivalId);
  if ("error" in draft) return { error: draft.error };
  const { error } = await supabase.from("cost_arrival_items").delete().eq("id", itemId).eq("arrival_id", arrivalId).eq("business_id", u.businessId);
  if (error) return { error: "Impossible de retirer la ligne" };
  refresh(arrivalId);
  return { success: "Ligne retirée" };
}

/** « Reprendre un achat » : recopie les lignes d'un achat déjà saisi ; l'arrivage passe en « prix seulement » (la marchandise est déjà comptée). */
export async function importPurchaseAction(arrivalId: string, purchaseId: string): Promise<CostResult> {
  const u = await user();
  const draft = await draftOf(u.businessId, arrivalId);
  if ("error" in draft) return { error: draft.error };
  const { data: purchase } = await supabase.from("purchases").select("id").eq("id", purchaseId).eq("business_id", u.businessId).maybeSingle();
  if (!purchase) return { error: "Achat introuvable" };
  const { data: lines } = await supabase.from("purchase_items").select("productId:product_id, quantity, unitPrice:unit_price").eq("purchase_id", purchaseId);
  const rows = (lines ?? []) as { productId: string; quantity: number; unitPrice: number }[];
  if (rows.length === 0) return { error: "Cet achat n'a aucune ligne" };
  const { data: existing } = await supabase.from("cost_arrival_items").select("productId:product_id").eq("arrival_id", arrivalId);
  const already = new Set(((existing ?? []) as { productId: string }[]).map((e) => e.productId));
  const toAdd = rows.filter((r) => !already.has(r.productId));
  if (toAdd.length > 0) {
    const { error } = await supabase.from("cost_arrival_items").insert(
      toAdd.map((r, index) => ({
        business_id: u.businessId,
        arrival_id: arrivalId,
        product_id: r.productId,
        quantity: r.quantity,
        unit_price: r.unitPrice,
        position: already.size + index,
      }))
    );
    if (error) return { error: "Impossible de reprendre l'achat" };
  }
  await supabase.from("cost_arrivals").update({ purchase_id: purchaseId, stock_mode: "PRIX_SEULEMENT", updated_at: new Date().toISOString() }).eq("id", arrivalId).eq("business_id", u.businessId);
  refresh(arrivalId);
  return { success: `${toAdd.length} ligne(s) reprise(s) — l'arrivage passe en « prix seulement »` };
}

// ---------------------------------------------------------------------------
// Frais
// ---------------------------------------------------------------------------
const expenseSchema = z.object({
  label: z.string().trim().min(1, "Nommez ce frais").max(80),
  amount: z.number().min(0, "Montant invalide").max(1_000_000_000_000),
  rule: z.enum(RULES),
  manualShares: z.record(z.string(), z.number().min(0)).nullable().optional(),
});

export async function addArrivalExpenseAction(arrivalId: string, input: { label: string; amount: number; rule: (typeof RULES)[number] }): Promise<CostResult> {
  const u = await user();
  const draft = await draftOf(u.businessId, arrivalId);
  if ("error" in draft) return { error: draft.error };
  const parsed = expenseSchema.pick({ label: true, amount: true, rule: true }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  const { count } = await supabase.from("cost_arrival_expenses").select("id", { count: "exact", head: true }).eq("arrival_id", arrivalId);
  const { error } = await supabase.from("cost_arrival_expenses").insert({
    business_id: u.businessId,
    arrival_id: arrivalId,
    label: parsed.data.label,
    amount: parsed.data.amount,
    rule: parsed.data.rule,
    position: count ?? 0,
  });
  if (error) return { error: "Impossible d'ajouter le frais" };
  refresh(arrivalId);
  return { success: "Frais ajouté" };
}

export async function updateArrivalExpenseAction(arrivalId: string, expenseId: string, patch: Partial<z.input<typeof expenseSchema>>): Promise<CostResult> {
  const u = await user();
  const draft = await draftOf(u.businessId, arrivalId);
  if ("error" in draft) return { error: draft.error };
  const parsed = expenseSchema.partial().safeParse(patch);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  const p = parsed.data;
  const update: Record<string, unknown> = {};
  if (p.label !== undefined) update.label = p.label;
  if (p.amount !== undefined) update.amount = p.amount;
  if (p.rule !== undefined) update.rule = p.rule;
  if (p.manualShares !== undefined) update.manual_shares = p.manualShares;
  if (Object.keys(update).length === 0) return { success: "Rien à changer" };
  const { error } = await supabase.from("cost_arrival_expenses").update(update).eq("id", expenseId).eq("arrival_id", arrivalId).eq("business_id", u.businessId);
  if (error) return { error: "Impossible d'enregistrer le frais" };
  refresh(arrivalId);
  return { success: "Enregistré" };
}

export async function removeArrivalExpenseAction(arrivalId: string, expenseId: string): Promise<CostResult> {
  const u = await user();
  const draft = await draftOf(u.businessId, arrivalId);
  if ("error" in draft) return { error: draft.error };
  const { error } = await supabase.from("cost_arrival_expenses").delete().eq("id", expenseId).eq("arrival_id", arrivalId).eq("business_id", u.businessId);
  if (error) return { error: "Impossible de retirer le frais" };
  refresh(arrivalId);
  return { success: "Frais retiré" };
}

// ---------------------------------------------------------------------------
// Application et retour arrière
// ---------------------------------------------------------------------------
/**
 * Applique l'arrivage : stock (si demandé), prix d'achat et prix de vente du catalogue, historique.
 * La base ne permet pas une transaction unique ici : l'arrivage passe d'abord à EN_COURS, chaque
 * ligne n'est marquée « faite » qu'après ses effets, et une reprise saute les lignes déjà faites
 * (et le stock déjà entré) — rien n'est donc jamais compté deux fois.
 */
export async function applyArrivalAction(id: string): Promise<CostResult> {
  const u = await user();
  // Verrou : un seul « Appliquer » à la fois. Une reprise n'est permise que si l'application précédente
  // est restée figée plus de 2 minutes (erreur en cours de route), jamais pendant qu'elle tourne.
  let { data: claimed } = await supabase
    .from("cost_arrivals")
    .update({ status: "EN_COURS", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", u.businessId)
    .eq("status", "BROUILLON")
    .select("id");
  if (!claimed || claimed.length === 0) {
    const stale = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    ({ data: claimed } = await supabase
      .from("cost_arrivals")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("business_id", u.businessId)
      .eq("status", "EN_COURS")
      .lt("updated_at", stale)
      .select("id"));
  }
  if (!claimed || claimed.length === 0) return { error: "Cet arrivage est déjà en cours d'application ou ne peut plus l'être." };

  const found = await getArrival(u.businessId, id);
  if (!found) return { error: "Arrivage introuvable" };
  const { arrival, items, expenses } = found;
  if (items.length === 0) {
    await supabase.from("cost_arrivals").update({ status: "BROUILLON" }).eq("id", id).eq("business_id", u.businessId);
    return { error: "Ajoutez au moins un article avant d'appliquer." };
  }

  const fx = arrival.fxRate > 0 ? arrival.fxRate : 1;
  const lines: CostLine[] = items.map((i) => ({ id: i.id, quantity: i.quantity, unitPrice: i.unitPrice * fx, weight: i.weight, volume: i.volume }));
  const exps: CostExpense[] = expenses.map((e) => ({
    id: e.id,
    label: e.label,
    amount: e.amount * fx,
    rule: e.rule,
    manual: e.manualShares ? Object.fromEntries(Object.entries(e.manualShares).map(([k, v]) => [k, v * fx])) : undefined,
  }));
  const costs = computeLandedCosts(lines, exps);
  const margin = { mode: arrival.marginMode, value: arrival.marginValue };

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (item.appliedAt) continue;
    const cost = costs[index];
    // Signe de vie : une application longue ne doit pas passer pour figée.
    await supabase.from("cost_arrivals").update({ updated_at: new Date().toISOString() }).eq("id", id).eq("business_id", u.businessId);

    const { data: row } = await supabase
      .from("cost_arrival_items")
      .select("oldPurchasePrice:old_purchase_price, oldSalePrice:old_sale_price, oldStock:old_stock, stockEnteredAt:stock_entered_at")
      .eq("id", item.id)
      .maybeSingle();
    let snap = row as { oldPurchasePrice: number | null; oldSalePrice: number | null; oldStock: number | null; stockEnteredAt: string | null } | null;
    if (!snap) return { error: `Ligne introuvable : ${item.name}` };

    // 1) Photographie « avant » : prise une seule fois, avant tout effet.
    if (snap.oldPurchasePrice === null || snap.oldStock === null) {
      const { data: product } = await supabase.from("products").select("purchasePrice:purchase_price, salePrice:sale_price").eq("id", item.productId).eq("business_id", u.businessId).maybeSingle();
      if (!product) return { error: `Produit introuvable : ${item.name}` };
      const { data: stocks } = await supabase.from("product_stocks").select("quantity").eq("product_id", item.productId);
      const total = ((stocks ?? []) as { quantity: number }[]).reduce((s, r) => s + Number(r.quantity), 0);
      // « Prix seulement » : la marchandise est déjà dans le stock ; on retire cet arrivage pour retrouver l'ancien stock.
      const oldStock = arrival.stockMode === "ENTRER_STOCK" ? total : Math.max(0, total - item.quantity);
      const { error: snapError } = await supabase
        .from("cost_arrival_items")
        .update({ old_purchase_price: product.purchasePrice, old_sale_price: product.salePrice, old_stock: oldStock })
        .eq("id", item.id);
      if (snapError) return { error: `Impossible de préparer la ligne : ${item.name}` };
      snap = { oldPurchasePrice: product.purchasePrice as number, oldSalePrice: product.salePrice as number, oldStock, stockEnteredAt: snap.stockEnteredAt };
    }

    // 2) Stock (une seule fois par ligne).
    if (arrival.stockMode === "ENTRER_STOCK" && !snap.stockEnteredAt) {
      try {
        const { oldStock, newStock } = await adjustStock({ productId: item.productId, locationId: arrival.locationId, delta: item.quantity });
        await supabase.from("stock_movements").insert({
          business_id: u.businessId,
          location_id: arrival.locationId,
          product_id: item.productId,
          direction: "IN",
          reason: "ACHAT",
          quantity: item.quantity,
          old_stock: oldStock,
          new_stock: newStock,
          note: `Arrivage : ${arrival.name}`,
          user_id: u.id,
        });
      } catch (e) {
        console.error("[applyArrivalAction] Échec du stock :", e instanceof Error ? e.message : e);
        return { error: `Le stock de « ${item.name} » n'a pas pu être mis à jour. Relancez « Appliquer » : les lignes déjà faites ne seront pas refaites.` };
      }
      const { error: markError } = await supabase.from("cost_arrival_items").update({ stock_entered_at: new Date().toISOString() }).eq("id", item.id);
      if (markError) {
        console.error("[applyArrivalAction] Stock entré mais non marqué :", markError.message);
        return { error: `Le stock de « ${item.name} » est entré mais n'a pas pu être marqué. Ne relancez pas : contactez le support.` };
      }
    }

    // 3) Prix du catalogue.
    const unitCost = cost.unitCost;
    const suggested = linePrice(unitCost, margin, arrival.roundingStep, snap.oldSalePrice ?? item.currentSalePrice);
    const newSale = item.applySalePrice ? (item.salePriceOverride ?? suggested) : (snap.oldSalePrice ?? item.currentSalePrice);
    const newPurchase = newPurchasePrice({
      oldQty: snap.oldStock ?? 0,
      oldPrice: snap.oldPurchasePrice ?? 0,
      newQty: item.quantity,
      newUnitCost: unitCost,
      averageWithOld: arrival.averageWithOld,
    });
    const priceUpdate: Record<string, unknown> = { purchase_price: newPurchase, updated_at: new Date().toISOString() };
    if (item.applySalePrice) priceUpdate.sale_price = newSale;
    const { error: priceError } = await supabase.from("products").update(priceUpdate).eq("id", item.productId).eq("business_id", u.businessId);
    if (priceError) return { error: `Le prix de « ${item.name} » n'a pas pu être mis à jour. Relancez « Appliquer ».` };

    // 4) Historique (une seule ligne par produit et par arrivage).
    const { count: already } = await supabase
      .from("product_price_history")
      .select("id", { count: "exact", head: true })
      .eq("arrival_id", id)
      .eq("product_id", item.productId)
      .eq("reason", "ARRIVAGE");
    if (!already) {
      await supabase.from("product_price_history").insert({
        business_id: u.businessId,
        product_id: item.productId,
        arrival_id: id,
        old_purchase_price: snap.oldPurchasePrice,
        new_purchase_price: newPurchase,
        old_sale_price: snap.oldSalePrice,
        new_sale_price: item.applySalePrice ? newSale : snap.oldSalePrice,
        stock_at_change: (snap.oldStock ?? 0) + item.quantity,
        reason: "ARRIVAGE",
        user_id: u.id,
      });
    }

    // 5) Ligne terminée.
    await supabase
      .from("cost_arrival_items")
      .update({ unit_cost: unitCost, new_purchase_price: newPurchase, new_sale_price: item.applySalePrice ? newSale : snap.oldSalePrice, applied_at: new Date().toISOString() })
      .eq("id", item.id);
  }

  await supabase.from("cost_arrivals").update({ status: "APPLIQUE", applied_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("business_id", u.businessId);
  await logAction({ businessId: u.businessId, userId: u.id, action: "UPDATE", entity: "CostArrival", entityId: id, details: `Prix appliqués : ${arrival.name}` });
  revalidatePath("/produits");
  revalidatePath("/stock");
  refresh(id);
  return { success: "Prix appliqués au catalogue" };
}

/** Remet les anciens prix (jamais le stock : la marchandise est bien arrivée). Les articles dont le prix a changé depuis sont laissés tranquilles. */
export async function revertArrivalAction(id: string): Promise<CostResult> {
  const u = await user();
  const found = await getArrival(u.businessId, id);
  if (!found) return { error: "Arrivage introuvable" };
  if (found.arrival.status !== "APPLIQUE") return { error: "Seul un arrivage appliqué peut être rétabli." };

  let restored = 0;
  let untouched = 0;
  for (const item of found.items) {
    if (!item.appliedAt || item.oldPurchasePrice === null) continue;
    const { data: product } = await supabase.from("products").select("purchasePrice:purchase_price, salePrice:sale_price").eq("id", item.productId).eq("business_id", u.businessId).maybeSingle();
    if (!product) continue;
    const purchaseSame = Math.abs(Number(product.purchasePrice) - (item.newPurchasePrice ?? NaN)) < 0.5;
    const saleSame = !item.applySalePrice || Math.abs(Number(product.salePrice) - (item.newSalePrice ?? NaN)) < 0.5;
    if (!purchaseSame || !saleSame) {
      untouched++;
      continue;
    }
    const update: Record<string, unknown> = { purchase_price: item.oldPurchasePrice, updated_at: new Date().toISOString() };
    if (item.applySalePrice && item.oldSalePrice !== null) update.sale_price = item.oldSalePrice;
    const { error } = await supabase.from("products").update(update).eq("id", item.productId).eq("business_id", u.businessId);
    if (error) {
      untouched++;
      continue;
    }
    await supabase.from("product_price_history").insert({
      business_id: u.businessId,
      product_id: item.productId,
      arrival_id: id,
      old_purchase_price: product.purchasePrice,
      new_purchase_price: item.oldPurchasePrice,
      old_sale_price: product.salePrice,
      new_sale_price: item.applySalePrice ? item.oldSalePrice : product.salePrice,
      reason: "RETABLI",
      user_id: u.id,
    });
    restored++;
  }
  await supabase.from("cost_arrivals").update({ status: "RETABLI", reverted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("business_id", u.businessId);
  await logAction({ businessId: u.businessId, userId: u.id, action: "UPDATE", entity: "CostArrival", entityId: id, details: `Anciens prix remis : ${restored} article(s)` });
  revalidatePath("/produits");
  refresh(id);
  return {
    success: `${restored} article(s) remis à leur ancien prix${untouched > 0 ? `, ${untouched} laissé(s) tel(s) quel(s) car leur prix a changé depuis` : ""}. Le stock n'a pas été modifié.`,
  };
}

export async function getProductPriceHistoryAction(productId: string): Promise<PriceHistoryRow[]> {
  const u = await user();
  return getPriceHistory(u.businessId, productId);
}

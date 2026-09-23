"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission, requireUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generateSaleNumber } from "@/lib/reference";
import { adjustStock } from "@/lib/stock";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";
import { getBusinessSettings } from "@/lib/business-settings";
import { sendPushToBusiness } from "@/lib/push";
import { formatMoney } from "@/lib/format";
import { consumeExpiryBatchesFefo } from "@/lib/actions/expiry";
import { checkBelowCost, checkCancelRules, checkMaxDiscount } from "@/lib/sale-rules";
import type { PaymentMethod } from "@/lib/db-types";

export type CartItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  /** Exemplaire précis vendu (produit à suivi unitaire — moto/engin), voir lib/actions/vehicle-units.ts. */
  vehicleUnitId?: string;
  /**
   * Vente par conditionnement (ex. "Carton de 12") plutôt qu'à l'unité —
   * voir lib/actions/packaging-units.ts. `quantity` compte alors des colis,
   * pas des unités de base : c'est `multiplier` qui donne le nombre réel
   * d'unités de base à déduire de product_stocks (quantity * multiplier).
   * Le prix total (unitPrice * quantity) reste correct sans aucun ajustement
   * puisque unitPrice est déjà le prix du colis.
   */
  packagingUnitId?: string;
  packagingLabel?: string;
  multiplier?: number;
};

export type CreateSaleInput = {
  locationId: string;
  items: CartItemInput[];
  customerId?: string;
  discount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  note?: string;
  documentType?: "TICKET" | "FACTURE";
  /**
   * Référence générée côté client pour une vente enregistrée hors ligne
   * (voir lib/offline/), rejouée ici dès le retour de la connexion. Rend
   * l'appel idempotent : si une vente porte déjà cette référence pour ce
   * commerce, elle est renvoyée telle quelle plutôt que dupliquée.
   */
  clientRef?: string;
  /** Opérateur choisi quand paymentMethod = MOBILE_MONEY (Paramètres > opérateurs proposés). */
  mobileMoneyOperator?: "ORANGE" | "MOOV" | "WAVE";
  /** Répartition espèces/mobile money quand paymentMethod = MIXTE — doit sommer à amountPaid. */
  cashPortion?: number;
  mobilePortion?: number;
};

export type CreateSaleResult = { success: true; saleId: string } | { success: false; error: string };

export type SaleItemRow = {
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  discount: number;
  total: number;
  packaging_unit_id: string | null;
  multiplier: number;
  unit_label: string | null;
};

/**
 * Insère les lignes de vente. Si les colonnes de conditionnement
 * (packaging_unit_id/multiplier/unit_label) n'existent pas encore en base
 * (migration pas encore exécutée), retombe automatiquement sur un insert
 * sans ces colonnes plutôt que de casser TOUTE vente — pas seulement celles
 * qui utilisent un conditionnement — le temps que la migration soit faite.
 */
export async function insertSaleItems(rows: SaleItemRow[]) {
  const { error } = await supabase.from("sale_items").insert(rows);
  if (!error) return { error: null };
  if (!/packaging_unit_id|multiplier|unit_label/.test(error.message)) return { error };

  console.error("[insertSaleItems] Colonnes de conditionnement absentes, repli sans ces champs :", error.message);
  const legacyRows = rows.map((r) => ({
    sale_id: r.sale_id,
    product_id: r.product_id,
    quantity: r.quantity,
    unit_price: r.unit_price,
    unit_cost: r.unit_cost,
    discount: r.discount,
    total: r.total,
  }));
  const { error: legacyError } = await supabase.from("sale_items").insert(legacyRows);
  return { error: legacyError };
}

/**
 * Enregistre les mouvements de stock (sortie) pour chaque article vendu.
 * Non bloquant en cas d'échec partiel de l'écriture du journal de mouvement
 * (l'ajustement du stock lui-même, via adjustStock, est déjà fait avant) —
 * limite connue de la migration hors transaction Prisma, voir le commit.
 */
export async function recordStockMovements(
  items: { productId: string; quantity: number }[],
  params: { businessId: string; locationId: string; userId: string; direction: "IN" | "OUT"; reason: string; note: string }
) {
  // En parallèle plutôt qu'un for-loop séquentiel : chaque article touche une
  // ligne product_stocks différente (adjustStock est atomique par ligne côté
  // base), donc rien n'empêche de lancer les appels en même temps. Pour un
  // panier de plusieurs dizaines d'articles, la version séquentielle pouvait
  // approcher/dépasser le délai maximum d'une fonction Vercel.
  await Promise.all(
    items
      .filter((item) => item.quantity !== 0)
      .map((item) => recordOneStockMovement(item, params))
  );
}

async function recordOneStockMovement(
  item: { productId: string; quantity: number },
  params: { businessId: string; locationId: string; userId: string; direction: "IN" | "OUT"; reason: string; note: string }
) {
  const { oldStock, newStock } = await adjustStock({
    productId: item.productId,
    locationId: params.locationId,
    delta: params.direction === "IN" ? item.quantity : -item.quantity,
  });
  const { error } = await supabase.from("stock_movements").insert({
    business_id: params.businessId,
    location_id: params.locationId,
    product_id: item.productId,
    direction: params.direction,
    reason: params.reason,
    quantity: item.quantity,
    old_stock: oldStock,
    new_stock: newStock,
    user_id: params.userId,
    note: params.note,
  });
  if (error) console.error("[sales] Échec de l'écriture du mouvement de stock :", error.message);
}

/**
 * Filet de sécurité : une panne inattendue (ex. fonction Postgres manquante,
 * coupure réseau vers Supabase...) ne doit jamais faire planter tout l'écran
 * de caisse avec la page d'erreur générique — la caissière doit voir un
 * message clair et pouvoir réessayer, pas un écran bloqué.
 */
export async function createSaleAction(input: CreateSaleInput): Promise<CreateSaleResult> {
  try {
    return await createSaleImpl(input);
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[createSaleAction] Erreur inattendue :", e);
    return { success: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

async function createSaleImpl(input: CreateSaleInput): Promise<CreateSaleResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  if (input.clientRef) {
    const { data: existing } = await supabase
      .from("sales")
      .select("id")
      .eq("business_id", user.businessId)
      .eq("client_ref", input.clientRef)
      .maybeSingle();
    if (existing) return { success: true, saleId: existing.id as string };
  }

  if (!input.locationId) return { success: false, error: "Boutique introuvable" };
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "Le panier est vide" };
  }

  const businessSettings = await getBusinessSettings(user.businessId);
  if (businessSettings.requireCustomerOnSale && !input.customerId) {
    return { success: false, error: "Sélectionnez un client — réglage activé dans Paramètres" };
  }

  const { data: location } = await supabase
    .from("locations")
    .select("id, name")
    .eq("id", input.locationId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!location) return { success: false, error: "Boutique introuvable" };

  const { data: activeSession } = await supabase
    .from("cash_sessions")
    .select("id")
    .eq("business_id", user.businessId)
    .eq("location_id", input.locationId)
    .eq("status", "OUVERTE")
    .maybeSingle();
  if (!activeSession) {
    return { success: false, error: "Ouvrez une session de caisse avant d'encaisser une vente" };
  }

  const productIds = input.items.map((i) => i.productId);
  const [{ data: products }, { data: stocks }] = await Promise.all([
    supabase.from("products").select("id, name, purchasePrice:purchase_price").in("id", productIds).eq("business_id", user.businessId),
    supabase.from("product_stocks").select("productId:product_id, quantity").in("product_id", productIds).eq("location_id", input.locationId),
  ]);
  const productMap = new Map(
    ((products ?? []) as unknown as Array<{ id: string; name: string; purchasePrice: number }>).map((p) => [p.id, p])
  );
  const stockMap = new Map(((stocks ?? []) as Array<{ productId: string; quantity: number }>).map((s) => [s.productId, s.quantity]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) return { success: false, error: "Un produit du panier est introuvable" };
    if (item.quantity <= 0) return { success: false, error: "Quantité invalide" };
    const baseUnitsNeeded = item.quantity * (item.multiplier ?? 1);
    const available = stockMap.get(item.productId) ?? 0;
    if (available < baseUnitsNeeded) {
      return {
        success: false,
        error: `Stock insuffisant pour "${product.name}" à ${location.name} (disponible : ${available})`,
      };
    }
  }

  // Produits à suivi unitaire (moto/engin) : vérifie que chaque exemplaire
  // choisi est toujours "EN_STOCK" juste avant de vendre — un autre poste de
  // caisse a pu le vendre entre-temps, ce que la vérification générique de
  // quantité ci-dessus ne détecte pas forcément (le stock total du modèle
  // peut rester suffisant même si CET exemplaire précis n'est plus dispo).
  const vehicleUnitIds = input.items.map((i) => i.vehicleUnitId).filter((id): id is string => !!id);
  if (vehicleUnitIds.length > 0) {
    const { data: units } = await supabase
      .from("vehicle_units")
      .select("id, status, chassisNumber:chassis_number")
      .eq("business_id", user.businessId)
      .in("id", vehicleUnitIds);
    const unitMap = new Map(
      ((units ?? []) as unknown as Array<{ id: string; status: string; chassisNumber: string }>).map((u) => [u.id, u])
    );
    for (const unitId of vehicleUnitIds) {
      const unit = unitMap.get(unitId);
      if (!unit || unit.status !== "EN_STOCK") {
        return {
          success: false,
          error: `L'exemplaire ${unit?.chassisNumber ?? ""} vient d'être vendu ou n'est plus disponible — rafraîchissez la page.`,
        };
      }
    }
  }

  const belowCostError = await checkBelowCost(user.businessId, user.role, input.items, productMap);
  if (belowCostError) return { success: false, error: belowCostError };
  const discountError = await checkMaxDiscount(user.businessId, user.role, input.items, input.discount);
  if (discountError) return { success: false, error: discountError };

  const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity - i.discount, 0);
  const total = Math.max(0, subtotal - input.discount);
  const amountPaid = Math.max(0, input.amountPaid);

  if (amountPaid < total && !input.customerId) {
    return { success: false, error: "Sélectionnez un client pour une vente à crédit ou partielle" };
  }

  if (businessSettings.blockSaleIfCustomerDebt && input.customerId) {
    const { data: pastSales } = await supabase
      .from("sales")
      .select("total, amountPaid:amount_paid")
      .eq("business_id", user.businessId)
      .eq("customer_id", input.customerId)
      .in("status", ["CREDIT", "PARTIELLE"]);
    const debt = ((pastSales ?? []) as Array<{ total: number; amountPaid: number }>).reduce(
      (sum, s) => sum + Math.max(0, s.total - s.amountPaid),
      0
    );
    if (debt > 0) {
      return { success: false, error: "Ce client a une dette en cours — réglez-la avant une nouvelle vente (réglage activé dans Paramètres)" };
    }
  }

  if (input.paymentMethod === "MIXTE") {
    const sum = Math.round((input.cashPortion ?? 0) + (input.mobilePortion ?? 0));
    if (sum !== Math.round(amountPaid)) {
      return { success: false, error: "La part espèces et la part mobile money doivent correspondre au montant reçu" };
    }
  }

  const status = amountPaid >= total ? "PAYEE" : amountPaid > 0 ? "PARTIELLE" : "CREDIT";
  const number = await generateSaleNumber(user.businessId);

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      business_id: user.businessId,
      location_id: input.locationId,
      number,
      customer_id: input.customerId || null,
      user_id: user.id,
      subtotal,
      discount: input.discount,
      total,
      amount_paid: amountPaid,
      payment_method: input.paymentMethod,
      status,
      document_type: input.documentType ?? "TICKET",
      note: input.note ?? null,
      client_ref: input.clientRef ?? null,
      mobile_money_operator: input.paymentMethod === "MOBILE_MONEY" ? input.mobileMoneyOperator ?? null : null,
      cash_portion: input.paymentMethod === "MIXTE" ? input.cashPortion ?? null : null,
      mobile_portion: input.paymentMethod === "MIXTE" ? input.mobilePortion ?? null : null,
      session_id: activeSession.id,
    })
    .select("id")
    .single();
  if (saleError || !sale) {
    console.error("[createSaleAction] Échec de la création de la vente :", saleError?.message);
    return { success: false, error: "Impossible d'enregistrer la vente" };
  }

  const { error: itemsError } = await insertSaleItems(
    input.items.map((i) => {
      const product = productMap.get(i.productId)!;
      return {
        sale_id: sale.id as string,
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        unit_cost: product.purchasePrice,
        discount: i.discount,
        total: i.unitPrice * i.quantity - i.discount,
        packaging_unit_id: i.packagingUnitId ?? null,
        multiplier: i.multiplier ?? 1,
        unit_label: i.packagingLabel ?? null,
      };
    })
  );
  if (itemsError) {
    console.error("[createSaleAction] Échec de l'enregistrement des articles :", itemsError.message);
    return { success: false, error: "Impossible d'enregistrer les articles de la vente" };
  }

  if (vehicleUnitIds.length > 0) {
    const { error: unitsError } = await supabase
      .from("vehicle_units")
      .update({ status: "VENDU", sale_id: sale.id, updated_at: new Date().toISOString() })
      .in("id", vehicleUnitIds);
    if (unitsError) {
      console.error("[createSaleAction] Échec du marquage des exemplaires vendus :", unitsError.message);
    }
  }

  await recordStockMovements(
    input.items.map((i) => ({ productId: i.productId, quantity: i.quantity * (i.multiplier ?? 1) })),
    {
      businessId: user.businessId,
      locationId: input.locationId,
      userId: user.id,
      direction: "OUT",
      reason: "VENTE",
      note: `Vente ${number}`,
    }
  );

  // Best-effort : décrémente le lot qui expire le plus tôt (FEFO) pour les
  // commerces avec le module Péremption actif (pharmacie/supermarché) — voir
  // lib/actions/expiry.ts. Ne bloque et ne fait jamais échouer la vente.
  await consumeExpiryBatchesFefo(
    input.items.map((i) => ({ productId: i.productId, quantity: i.quantity * (i.multiplier ?? 1) })),
    { businessId: user.businessId, locationId: input.locationId, activityKey: user.business.activityKey }
  );

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Sale",
    entityId: sale.id as string,
    details: `Total ${total}`,
  });

  revalidatePath("/ventes");
  revalidatePath("/ventes/historique");
  revalidatePath("/produits");
  revalidatePath("/dashboard");
  if (input.customerId) revalidatePath(`/clients/${input.customerId}`);

  await sendPushToBusiness(user.businessId, {
    title: "Nouvelle vente",
    body: `Vente ${number} — ${formatMoney(total, user.business.currency)}`,
    link: `/ventes/${sale.id}`,
  });

  return { success: true, saleId: sale.id as string };
}

export type UpdateSaleInput = {
  saleId: string;
  items: CartItemInput[];
  customerId?: string;
  discount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  note?: string;
};

export async function updateSaleAction(input: UpdateSaleInput): Promise<CreateSaleResult> {
  try {
    return await updateSaleImpl(input);
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[updateSaleAction] Erreur inattendue :", e);
    return { success: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

async function updateSaleImpl(input: UpdateSaleInput): Promise<CreateSaleResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  const { data: sale } = await supabase
    .from("sales")
    .select("id, number, locationId:location_id, customerId:customer_id, status")
    .eq("id", input.saleId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!sale) return { success: false, error: "Vente introuvable" };
  if (sale.status === "ANNULEE") {
    return { success: false, error: "Impossible de modifier une vente annulée" };
  }
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "Le panier est vide" };
  }

  const existingItemsRes = await supabase.from("sale_items").select("productId:product_id, quantity, multiplier").eq("sale_id", sale.id);
  let existingItems: Array<{ productId: string; quantity: number; multiplier?: number | null }> | null = existingItemsRes.data;
  if (existingItemsRes.error && /multiplier/.test(existingItemsRes.error.message)) {
    // Même repli que insertSaleItems : la colonne multiplier peut ne pas
    // encore exister en base pendant la fenêtre de déploiement de la
    // migration conditionnements.
    existingItems = (await supabase.from("sale_items").select("productId:product_id, quantity").eq("sale_id", sale.id)).data;
  }
  // En unités de base (quantité de colis * multiplicateur), pour comparer
  // correctement à une nouvelle ligne qui ne serait plus vendue par le même
  // conditionnement — voir la même logique dans createSaleImpl.
  const oldQtyMap = new Map(
    ((existingItems ?? []) as Array<{ productId: string; quantity: number; multiplier: number | null }>).map((i) => [
      i.productId,
      i.quantity * (i.multiplier ?? 1),
    ])
  );
  const productIds = Array.from(new Set([...oldQtyMap.keys(), ...input.items.map((i) => i.productId)]));

  const [{ data: products }, { data: stocks }] = await Promise.all([
    supabase.from("products").select("id, name, purchasePrice:purchase_price").in("id", productIds).eq("business_id", user.businessId),
    supabase.from("product_stocks").select("productId:product_id, quantity").in("product_id", productIds).eq("location_id", sale.locationId as string),
  ]);
  const productMap = new Map(
    ((products ?? []) as unknown as Array<{ id: string; name: string; purchasePrice: number }>).map((p) => [p.id, p])
  );
  const currentStockMap = new Map(((stocks ?? []) as Array<{ productId: string; quantity: number }>).map((s) => [s.productId, s.quantity]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) return { success: false, error: "Un produit du panier est introuvable" };
    if (item.quantity <= 0) return { success: false, error: "Quantité invalide" };
    // Le stock déjà réservé par l'ancienne version de cette vente reste disponible pour la nouvelle.
    const available = (currentStockMap.get(item.productId) ?? 0) + (oldQtyMap.get(item.productId) ?? 0);
    const baseUnitsNeeded = item.quantity * (item.multiplier ?? 1);
    if (available < baseUnitsNeeded) {
      return { success: false, error: `Stock insuffisant pour "${product.name}" (disponible : ${available})` };
    }
  }

  const belowCostError = await checkBelowCost(user.businessId, user.role, input.items, productMap);
  if (belowCostError) return { success: false, error: belowCostError };
  const discountError = await checkMaxDiscount(user.businessId, user.role, input.items, input.discount);
  if (discountError) return { success: false, error: discountError };

  const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity - i.discount, 0);
  const total = Math.max(0, subtotal - input.discount);
  const amountPaid = Math.max(0, input.amountPaid);

  if (amountPaid < total && !input.customerId) {
    return { success: false, error: "Sélectionnez un client pour une vente à crédit ou partielle" };
  }

  const status = amountPaid >= total ? "PAYEE" : amountPaid > 0 ? "PARTIELLE" : "CREDIT";

  const newQtyMap = new Map(input.items.map((i) => [i.productId, i.quantity * (i.multiplier ?? 1)]));
  const changedProductIds = productIds.filter((productId) => {
    const oldQty = oldQtyMap.get(productId) ?? 0;
    const newQty = newQtyMap.get(productId) ?? 0;
    return oldQty - newQty !== 0;
  });
  // En parallèle (voir recordStockMovements dans createSaleAction pour la même remarque).
  await Promise.all(
    changedProductIds.map(async (productId) => {
      const oldQty = oldQtyMap.get(productId) ?? 0;
      const newQty = newQtyMap.get(productId) ?? 0;
      const delta = oldQty - newQty;
      const { oldStock, newStock } = await adjustStock({ productId, locationId: sale.locationId as string, delta });
      const { error } = await supabase.from("stock_movements").insert({
        business_id: user.businessId,
        location_id: sale.locationId,
        product_id: productId,
        direction: delta > 0 ? "IN" : "OUT",
        reason: "CORRECTION",
        quantity: Math.abs(delta),
        old_stock: oldStock,
        new_stock: newStock,
        user_id: user.id,
        note: `Modification vente ${sale.number}`,
      });
      if (error) console.error("[updateSaleAction] Échec de l'écriture du mouvement de stock :", error.message);
    })
  );

  await supabase.from("sale_items").delete().eq("sale_id", sale.id);
  const { error: updateError } = await supabase
    .from("sales")
    .update({
      customer_id: input.customerId || null,
      subtotal,
      discount: input.discount,
      total,
      amount_paid: amountPaid,
      payment_method: input.paymentMethod,
      status,
      note: input.note ?? null,
    })
    .eq("id", sale.id);
  const { error: itemsError } = await insertSaleItems(
    input.items.map((i) => {
      const product = productMap.get(i.productId)!;
      return {
        sale_id: sale.id as string,
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        unit_cost: product.purchasePrice,
        discount: i.discount,
        total: i.unitPrice * i.quantity - i.discount,
        packaging_unit_id: i.packagingUnitId ?? null,
        multiplier: i.multiplier ?? 1,
        unit_label: i.packagingLabel ?? null,
      };
    })
  );
  if (updateError || itemsError) {
    console.error("[updateSaleAction] Échec de la mise à jour :", updateError?.message, itemsError?.message);
    return { success: false, error: "Impossible de mettre à jour la vente" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "Sale",
    entityId: sale.id as string,
    details: `Total ${total}`,
  });

  revalidatePath("/ventes/historique");
  revalidatePath(`/ventes/${sale.id}`);
  revalidatePath("/produits");
  revalidatePath("/dashboard");
  if (sale.customerId) revalidatePath(`/clients/${sale.customerId}`);
  if (input.customerId && input.customerId !== sale.customerId) revalidatePath(`/clients/${input.customerId}`);

  return { success: true, saleId: sale.id as string };
}

export async function cancelSaleAction(saleId: string, reason?: string) {
  try {
    return await cancelSaleImpl(saleId, reason);
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[cancelSaleAction] Erreur inattendue :", e);
    return { error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

async function cancelSaleImpl(saleId: string, reason?: string) {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);
  const cancelRuleError = await checkCancelRules(user.businessId, user.role, reason);
  if (cancelRuleError) return { error: cancelRuleError };
  const motif = reason?.trim() ? ` — motif : ${reason.trim()}` : "";

  const { data: sale } = await supabase
    .from("sales")
    .select("id, number, locationId:location_id, status")
    .eq("id", saleId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!sale) return { error: "Vente introuvable" };
  if (sale.status === "ANNULEE") return { error: "Cette vente est déjà annulée" };

  const { data: items } = await supabase.from("sale_items").select("productId:product_id, quantity").eq("sale_id", sale.id);

  await recordStockMovements((items ?? []) as Array<{ productId: string; quantity: number }>, {
    businessId: user.businessId,
    locationId: sale.locationId as string,
    userId: user.id,
    direction: "IN",
    reason: "RETOUR_CLIENT",
    note: `Annulation vente ${sale.number}${motif}`,
  });

  const { error } = await supabase.from("sales").update({ status: "ANNULEE" }).eq("id", sale.id);
  if (error) {
    console.error("[cancelSaleAction] Échec de l'annulation :", error.message);
    return { error: "Impossible d'annuler la vente" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CANCEL",
    entity: "Sale",
    entityId: sale.id as string,
    details: motif ? motif.slice(3) : undefined,
  });

  revalidatePath("/ventes/historique");
  revalidatePath(`/ventes/${sale.id}`);
  revalidatePath("/produits");
  return { success: "Vente annulée, stock réintégré" };
}

export async function getEnabledPaymentMethods() {
  const user = await requireUser();
  const { data: methods } = await supabase
    .from("payment_method_configs")
    .select("method, label")
    .eq("business_id", user.businessId)
    .eq("enabled", true);

  const canonicalOrder: PaymentMethod[] = ["ESPECES", "MOBILE_MONEY", "CARTE", "CREDIT", "AUTRE"];
  const byCanonicalOrder = (a: { method: PaymentMethod }, b: { method: PaymentMethod }) =>
    canonicalOrder.indexOf(a.method) - canonicalOrder.indexOf(b.method);

  if (!methods || methods.length === 0) {
    return [
      { method: "ESPECES" as PaymentMethod, label: "Espèces" },
      { method: "MOBILE_MONEY" as PaymentMethod, label: "Mobile Money" },
      { method: "CARTE" as PaymentMethod, label: "Carte bancaire" },
      { method: "CREDIT" as PaymentMethod, label: "Crédit" },
    ].sort(byCanonicalOrder);
  }
  return (methods as unknown as Array<{ method: PaymentMethod; label: string }>).sort(byCanonicalOrder);
}

/** "Marchandise payée non emportée" — marque qu'une vente déjà encaissée reste chez le commerçant. */
export async function markSaleUnclaimedAction(saleId: string) {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  const { error } = await supabase
    .from("sales")
    .update({ unclaimed_at: new Date().toISOString(), claimed_at: null })
    .eq("id", saleId)
    .eq("business_id", user.businessId);
  if (error) {
    console.error("[markSaleUnclaimedAction] Échec :", error.message);
    return { error: "Impossible de marquer cette vente" };
  }
  revalidatePath("/ventes/historique");
  return { success: true };
}

export async function markSaleClaimedAction(saleId: string) {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  const { error } = await supabase
    .from("sales")
    .update({ claimed_at: new Date().toISOString() })
    .eq("id", saleId)
    .eq("business_id", user.businessId);
  if (error) {
    console.error("[markSaleClaimedAction] Échec :", error.message);
    return { error: "Impossible de marquer cette vente" };
  }
  revalidatePath("/ventes/historique");
  return { success: true };
}

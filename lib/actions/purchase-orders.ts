"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generatePurchaseOrderNumber } from "@/lib/reference";
import { getCurrentLocation } from "@/lib/location";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";
import { competitorSuffix, type PurchaseOrderStatus } from "@/lib/purchase-orders";
import { createPurchaseAction } from "@/lib/actions/purchases";

/**
 * Demandes de prix / bons de commande fournisseur + réassort intelligent :
 * nouvelle fonctionnalité, désactivée par défaut tant qu'elle n'est pas
 * explicitement activée depuis /admin/fonctionnalites.
 */
const PURCHASE_ORDERS_FLAG = "bons-de-commande";

export async function ensurePurchaseOrdersFlagRegistered() {
  await registerFeatureFlag(
    PURCHASE_ORDERS_FLAG,
    "Bons de commande et réassort intelligent",
    "Réassort basé sur l'historique des ventes (cartons, délai, fournisseur le moins cher transport compris, budget), demandes de prix sans prix, mise en concurrence des fournisseurs, bons de commande et réception."
  );
}

export async function isPurchaseOrdersModuleEnabled(businessId: string): Promise<boolean> {
  await ensurePurchaseOrdersFlagRegistered();
  return isFeatureEnabled(PURCHASE_ORDERS_FLAG, businessId);
}

type Result<T = object> = ({ success: true } & T) | { success: false; error: string };

async function requireModule() {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);
  if (!(await isPurchaseOrdersModuleEnabled(user.businessId))) {
    throw new ModuleDisabledError();
  }
  return user;
}

class ModuleDisabledError extends Error {}

async function guard<R extends { success: boolean }>(label: string, fn: () => Promise<R>): Promise<R | { success: false; error: string }> {
  try {
    return await fn();
  } catch (e) {
    rethrowIfNavigationSignal(e);
    if (e instanceof ModuleDisabledError) return { success: false, error: "Module non activé pour votre commerce" };
    console.error(`[${label}] Erreur inattendue :`, e);
    return { success: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

function revalidateOrders(orderId?: string) {
  revalidatePath("/achats/commandes");
  revalidatePath("/reassort");
  if (orderId) revalidatePath(`/achats/commandes/${orderId}`);
}

type OrderRow = {
  id: string;
  businessId: string;
  status: PurchaseOrderStatus;
  groupNumber: string;
  number: string;
  supplierId: string;
  locationId: string;
};

async function loadOrder(orderId: string, businessId: string): Promise<OrderRow | null> {
  const { data } = await supabase
    .from("purchase_orders")
    .select("id, businessId:business_id, status, groupNumber:group_number, number, supplierId:supplier_id, locationId:location_id")
    .eq("id", orderId)
    .eq("business_id", businessId)
    .maybeSingle();
  return (data as unknown as OrderRow) ?? null;
}

async function checkSuppliers(businessId: string, supplierIds: string[]) {
  const { data } = await supabase.from("suppliers").select("id").eq("business_id", businessId).in("id", supplierIds);
  return (data ?? []).length === new Set(supplierIds).size;
}

async function checkProducts(businessId: string, productIds: string[]) {
  const { data } = await supabase.from("products").select("id").eq("business_id", businessId).in("id", productIds);
  return (data ?? []).length === new Set(productIds).size;
}

async function insertOrder(params: {
  businessId: string;
  userId: string;
  locationId: string;
  supplierId: string;
  number: string;
  groupNumber: string;
  items: { productId: string; quantity: number }[];
  responseBy?: string | null;
  note?: string | null;
}) {
  const { data: order, error } = await supabase
    .from("purchase_orders")
    .insert({
      business_id: params.businessId,
      location_id: params.locationId,
      supplier_id: params.supplierId,
      user_id: params.userId,
      number: params.number,
      group_number: params.groupNumber,
      status: "BROUILLON",
      response_by: params.responseBy || null,
      note: params.note || null,
    })
    .select("id")
    .single();
  if (error || !order) {
    console.error("[insertOrder] Échec de la création :", error?.message);
    return null;
  }
  const { error: itemsError } = await supabase.from("purchase_order_items").insert(
    params.items.map((item, position) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      position,
    }))
  );
  if (itemsError) {
    console.error("[insertOrder] Échec de l'enregistrement des articles :", itemsError.message);
    await supabase.from("purchase_orders").delete().eq("id", order.id);
    return null;
  }
  return order.id as string;
}

function validItems(items: { productId: string; quantity: number }[]) {
  return items.length > 0 && items.every((i) => i.productId && Number.isInteger(i.quantity) && i.quantity > 0);
}

/**
 * Crée une demande de prix (sans prix) pour un ou plusieurs fournisseurs.
 * Plusieurs fournisseurs = mise en concurrence : mêmes produits, un document
 * par fournisseur (numéros -A, -B, -C...), chacun ne voit que le sien.
 */
export async function createPurchaseOrderAction(input: {
  supplierIds: string[];
  locationId?: string;
  items: { productId: string; quantity: number }[];
  responseBy?: string | null;
  note?: string | null;
}): Promise<Result<{ orderIds: string[] }>> {
  return guard("createPurchaseOrderAction", async () => {
    const user = await requireModule();
    const supplierIds = [...new Set(input.supplierIds.filter(Boolean))];
    if (supplierIds.length === 0) return { success: false, error: "Choisissez au moins un fournisseur" };
    if (!validItems(input.items)) return { success: false, error: "Ajoutez au moins un produit avec une quantité valide" };
    if (!(await checkSuppliers(user.businessId, supplierIds))) return { success: false, error: "Fournisseur introuvable" };
    if (!(await checkProducts(user.businessId, input.items.map((i) => i.productId)))) {
      return { success: false, error: "Un produit est introuvable" };
    }
    const locationId = input.locationId || (await getCurrentLocation(user.businessId))?.id;
    if (!locationId) return { success: false, error: "Aucune boutique de livraison" };

    const base = await generatePurchaseOrderNumber(user.businessId);
    const orderIds: string[] = [];
    for (const [index, supplierId] of supplierIds.entries()) {
      const id = await insertOrder({
        businessId: user.businessId,
        userId: user.id,
        locationId,
        supplierId,
        number: supplierIds.length > 1 ? `${base}-${competitorSuffix(index)}` : base,
        groupNumber: base,
        items: input.items,
        responseBy: input.responseBy,
        note: input.note,
      });
      if (!id) return { success: false, error: "Impossible de créer la demande de prix" };
      orderIds.push(id);
    }

    await logAction({
      businessId: user.businessId,
      userId: user.id,
      action: "CREATE",
      entity: "PurchaseOrder",
      entityId: orderIds[0],
      details: `Demande de prix ${base} (${supplierIds.length} fournisseur${supplierIds.length > 1 ? "s" : ""})`,
    });
    revalidateOrders();
    return { success: true, orderIds };
  });
}

/**
 * Depuis le réassort : une demande de prix par fournisseur retenu (le
 * commerçant a pu changer le fournisseur proposé ligne par ligne).
 */
export async function createPurchaseOrdersFromRestockAction(input: {
  lines: { productId: string; quantity: number; supplierId: string }[];
}): Promise<Result<{ orderIds: string[] }>> {
  return guard("createPurchaseOrdersFromRestockAction", async () => {
    const user = await requireModule();
    if (input.lines.some((l) => !l.supplierId)) {
      return { success: false, error: "Choisissez un fournisseur pour chaque produit coché" };
    }
    if (!validItems(input.lines)) return { success: false, error: "Cochez au moins un produit avec une quantité valide" };
    const bySupplier = new Map<string, { productId: string; quantity: number }[]>();
    for (const l of input.lines) {
      const list = bySupplier.get(l.supplierId) ?? [];
      list.push({ productId: l.productId, quantity: l.quantity });
      bySupplier.set(l.supplierId, list);
    }
    if (!(await checkSuppliers(user.businessId, [...bySupplier.keys()]))) return { success: false, error: "Fournisseur introuvable" };
    if (!(await checkProducts(user.businessId, input.lines.map((l) => l.productId)))) {
      return { success: false, error: "Un produit est introuvable" };
    }
    const locationId = (await getCurrentLocation(user.businessId))?.id;
    if (!locationId) return { success: false, error: "Aucune boutique de livraison" };

    const orderIds: string[] = [];
    for (const [supplierId, items] of bySupplier) {
      const number = await generatePurchaseOrderNumber(user.businessId);
      const id = await insertOrder({
        businessId: user.businessId,
        userId: user.id,
        locationId,
        supplierId,
        number,
        groupNumber: number,
        items,
        note: "Préparée depuis le réassort",
      });
      if (!id) return { success: false, error: "Impossible de créer les demandes de prix" };
      orderIds.push(id);
    }

    await logAction({
      businessId: user.businessId,
      userId: user.id,
      action: "CREATE",
      entity: "PurchaseOrder",
      entityId: orderIds[0],
      details: `${orderIds.length} demande(s) de prix depuis le réassort`,
    });
    revalidateOrders();
    return { success: true, orderIds };
  });
}

/** Envoie la même demande à d'autres fournisseurs (mise en concurrence). */
export async function addCompetitorsAction(orderId: string, supplierIds: string[]): Promise<Result<{ orderIds: string[] }>> {
  return guard("addCompetitorsAction", async () => {
    const user = await requireModule();
    const order = await loadOrder(orderId, user.businessId);
    if (!order) return { success: false, error: "Demande introuvable" };
    if (order.status === "CONFIRMEE" || order.status === "RECUE" || order.status === "ANNULEE") {
      return { success: false, error: "Cette commande n'est plus une demande de prix" };
    }

    const { data: group } = await supabase
      .from("purchase_orders")
      .select("id, supplierId:supplier_id, number")
      .eq("business_id", user.businessId)
      .eq("group_number", order.groupNumber);
    const existingSuppliers = new Set((group ?? []).map((g) => g.supplierId as string));
    const newSuppliers = [...new Set(supplierIds)].filter((id) => id && !existingSuppliers.has(id));
    if (newSuppliers.length === 0) return { success: false, error: "Choisissez un autre fournisseur" };
    if (!(await checkSuppliers(user.businessId, newSuppliers))) return { success: false, error: "Fournisseur introuvable" };

    const { data: items } = await supabase
      .from("purchase_order_items")
      .select("productId:product_id, quantity")
      .eq("order_id", order.id)
      .order("position");

    // La demande d'origine, créée seule, n'avait pas de suffixe : elle devient -A.
    if (order.number === order.groupNumber) {
      await supabase.from("purchase_orders").update({ number: `${order.groupNumber}-A` }).eq("id", order.id);
    }
    const usedLetters = (group ?? []).length;
    const orderIds: string[] = [];
    for (const [i, supplierId] of newSuppliers.entries()) {
      const id = await insertOrder({
        businessId: user.businessId,
        userId: user.id,
        locationId: order.locationId,
        supplierId,
        number: `${order.groupNumber}-${competitorSuffix(usedLetters + i)}`,
        groupNumber: order.groupNumber,
        items: (items ?? []) as unknown as { productId: string; quantity: number }[],
      });
      if (!id) return { success: false, error: "Impossible de créer la demande" };
      orderIds.push(id);
    }
    revalidateOrders(order.id);
    return { success: true, orderIds };
  });
}

/** Modifie les produits/quantités d'une demande qui n'a pas encore de prix confirmés. */
export async function updateOrderItemsAction(
  orderId: string,
  items: { productId: string; quantity: number }[]
): Promise<Result> {
  return guard("updateOrderItemsAction", async () => {
    const user = await requireModule();
    const order = await loadOrder(orderId, user.businessId);
    if (!order) return { success: false, error: "Demande introuvable" };
    if (order.status !== "BROUILLON" && order.status !== "ENVOYEE") {
      return { success: false, error: "Les produits ne peuvent plus être modifiés à ce stade" };
    }
    if (!validItems(items)) return { success: false, error: "Ajoutez au moins un produit avec une quantité valide" };
    if (!(await checkProducts(user.businessId, items.map((i) => i.productId)))) {
      return { success: false, error: "Un produit est introuvable" };
    }
    await supabase.from("purchase_order_items").delete().eq("order_id", order.id);
    const { error } = await supabase.from("purchase_order_items").insert(
      items.map((item, position) => ({ order_id: order.id, product_id: item.productId, quantity: item.quantity, position }))
    );
    if (error) return { success: false, error: "Impossible d'enregistrer les produits" };
    await supabase.from("purchase_orders").update({ updated_at: new Date().toISOString() }).eq("id", order.id);
    revalidateOrders(order.id);
    return { success: true };
  });
}

export async function markOrderSentAction(orderId: string): Promise<Result> {
  return guard("markOrderSentAction", async () => {
    const user = await requireModule();
    const order = await loadOrder(orderId, user.businessId);
    if (!order) return { success: false, error: "Demande introuvable" };
    if (order.status !== "BROUILLON") return { success: true };
    await supabase
      .from("purchase_orders")
      .update({ status: "ENVOYEE", sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", order.id);
    revalidateOrders(order.id);
    return { success: true };
  });
}

export type SaveOrderPricesInput = {
  items: { id: string; unitPrice: number | null; quantity: number }[];
  transportCost: number | null;
  discount: number;
  expectedDeliveryDate: string | null;
  deliveryPlace: string | null;
  paymentTerms: string | null;
  deposit: number;
  note: string | null;
};

/**
 * Prix communiqués par le fournisseur : le commerçant saisit les prix
 * unitaires et ajuste les quantités qu'il souhaite réellement commander
 * (0 = produit retiré de la commande).
 */
export async function saveOrderPricesAction(orderId: string, input: SaveOrderPricesInput): Promise<Result> {
  return guard("saveOrderPricesAction", async () => {
    const user = await requireModule();
    const order = await loadOrder(orderId, user.businessId);
    if (!order) return { success: false, error: "Demande introuvable" };
    if (order.status === "RECUE" || order.status === "ANNULEE") {
      return { success: false, error: "Cette commande ne peut plus être modifiée" };
    }
    const kept = input.items.filter((i) => i.quantity > 0);
    if (kept.length === 0) return { success: false, error: "Gardez au moins un produit" };
    for (const item of input.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 0) return { success: false, error: "Quantité invalide" };
      if (item.quantity > 0 && (item.unitPrice == null || item.unitPrice < 0)) {
        return { success: false, error: "Saisissez le prix de chaque produit gardé" };
      }
    }
    if ((input.transportCost ?? 0) < 0 || input.discount < 0 || input.deposit < 0) {
      return { success: false, error: "Montant invalide" };
    }

    const { data: existing } = await supabase.from("purchase_order_items").select("id").eq("order_id", order.id);
    const existingIds = new Set((existing ?? []).map((e) => e.id as string));
    if (input.items.some((i) => !existingIds.has(i.id))) return { success: false, error: "Article introuvable" };

    await Promise.all(
      input.items.map((item) =>
        item.quantity === 0
          ? supabase.from("purchase_order_items").delete().eq("id", item.id)
          : supabase.from("purchase_order_items").update({ unit_price: item.unitPrice, quantity: item.quantity }).eq("id", item.id)
      )
    );

    const { error } = await supabase
      .from("purchase_orders")
      .update({
        status: order.status === "CONFIRMEE" ? "CONFIRMEE" : "PRIX_RECUS",
        transport_cost: input.transportCost,
        discount: input.discount,
        expected_delivery_date: input.expectedDeliveryDate || null,
        delivery_place: input.deliveryPlace || null,
        payment_terms: input.paymentTerms || null,
        deposit: input.deposit,
        note: input.note || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    if (error) return { success: false, error: "Impossible d'enregistrer les prix" };
    revalidateOrders(order.id);
    return { success: true };
  });
}

/**
 * Confirme la commande chez ce fournisseur : la demande devient un bon de
 * commande. Les autres demandes de la même mise en concurrence sont annulées
 * (non retenues).
 */
export async function confirmOrderAction(orderId: string): Promise<Result> {
  return guard("confirmOrderAction", async () => {
    const user = await requireModule();
    const order = await loadOrder(orderId, user.businessId);
    if (!order) return { success: false, error: "Demande introuvable" };
    if (order.status !== "PRIX_RECUS") return { success: false, error: "Saisissez d'abord les prix du fournisseur" };

    const now = new Date().toISOString();
    await supabase.from("purchase_orders").update({ status: "CONFIRMEE", confirmed_at: now, updated_at: now }).eq("id", order.id);
    await supabase
      .from("purchase_orders")
      .update({ status: "ANNULEE", note: "Non retenue (autre fournisseur choisi)", updated_at: now })
      .eq("business_id", user.businessId)
      .eq("group_number", order.groupNumber)
      .neq("id", order.id)
      .in("status", ["BROUILLON", "ENVOYEE", "PRIX_RECUS"]);

    await logAction({
      businessId: user.businessId,
      userId: user.id,
      action: "UPDATE",
      entity: "PurchaseOrder",
      entityId: order.id,
      details: `Bon de commande BC-${order.number} confirmé`,
    });
    revalidateOrders(order.id);
    return { success: true };
  });
}

/**
 * Réception : crée l'achat réel (le stock augmente, le prix d'achat et
 * l'historique des prix sont mis à jour) avec les quantités réellement reçues.
 */
export async function receiveOrderAction(
  orderId: string,
  input: { items: { id: string; receivedQuantity: number }[]; transportCost: number; amountPaid: number }
): Promise<Result<{ purchaseId: string }>> {
  return guard("receiveOrderAction", async () => {
    const user = await requireModule();
    const order = await loadOrder(orderId, user.businessId);
    if (!order) return { success: false, error: "Commande introuvable" };
    if (order.status !== "CONFIRMEE") return { success: false, error: "Seule une commande confirmée peut être réceptionnée" };

    const { data: items } = await supabase
      .from("purchase_order_items")
      .select("id, productId:product_id, unitPrice:unit_price")
      .eq("order_id", order.id);
    const byId = new Map((items ?? []).map((i) => [i.id as string, i as unknown as { id: string; productId: string; unitPrice: number | null }]));

    const received = input.items.filter((i) => i.receivedQuantity > 0);
    if (received.length === 0) return { success: false, error: "Indiquez au moins une quantité reçue" };
    for (const r of input.items) {
      if (!byId.has(r.id)) return { success: false, error: "Article introuvable" };
      if (!Number.isInteger(r.receivedQuantity) || r.receivedQuantity < 0) return { success: false, error: "Quantité invalide" };
    }

    const result = await createPurchaseAction({
      supplierId: order.supplierId,
      locationId: order.locationId,
      items: received.map((r) => ({
        productId: byId.get(r.id)!.productId,
        quantity: r.receivedQuantity,
        unitPrice: byId.get(r.id)!.unitPrice ?? 0,
      })),
      amountPaid: input.amountPaid,
      transportCost: input.transportCost,
      note: `Réception du bon de commande BC-${order.number}`,
    });
    if (!result.success) return result;

    await Promise.all(
      input.items.map((r) => supabase.from("purchase_order_items").update({ received_quantity: r.receivedQuantity }).eq("id", r.id))
    );
    const now = new Date().toISOString();
    await supabase
      .from("purchase_orders")
      .update({ status: "RECUE", purchase_id: result.purchaseId, received_at: now, updated_at: now })
      .eq("id", order.id);

    revalidateOrders(order.id);
    return { success: true, purchaseId: result.purchaseId };
  });
}

export async function cancelOrderAction(orderId: string): Promise<Result> {
  return guard("cancelOrderAction", async () => {
    const user = await requireModule();
    const order = await loadOrder(orderId, user.businessId);
    if (!order) return { success: false, error: "Commande introuvable" };
    if (order.status === "RECUE") return { success: false, error: "Une commande reçue ne peut pas être annulée" };
    await supabase.from("purchase_orders").update({ status: "ANNULEE", updated_at: new Date().toISOString() }).eq("id", order.id);
    await logAction({
      businessId: user.businessId,
      userId: user.id,
      action: "UPDATE",
      entity: "PurchaseOrder",
      entityId: order.id,
      details: `Commande ${order.number} annulée`,
    });
    revalidateOrders(order.id);
    return { success: true };
  });
}

/** Nombre par carton d'un produit ajouté à une demande (saisie en cartons). */
export async function getUnitsPerCartonAction(productId: string): Promise<number | null> {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);
  const { data } = await supabase
    .from("products")
    .select("unitsPerCarton:units_per_carton")
    .eq("id", productId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  return (data?.unitsPerCarton as number | null) ?? null;
}

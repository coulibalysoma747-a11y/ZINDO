"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { adjustStock } from "@/lib/stock";
import { generateCustomOrderNumber } from "@/lib/reference";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { CUSTOM_ORDERS_FLAG, ARTISAN_ACTIVITY_KEY } from "@/lib/nav";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";
import type { CustomOrderStatus, PaymentMethod } from "@/lib/db-types";

export { ARTISAN_ACTIVITY_KEY };

export const CUSTOM_ORDER_STATUS_LABELS: Record<CustomOrderStatus, string> = {
  EN_COURS: "En cours",
  PRET: "Prêt",
  LIVRE: "Livré",
  ANNULE: "Annulé",
};

export const CUSTOM_ORDER_STATUS_FLOW: CustomOrderStatus[] = ["EN_COURS", "PRET", "LIVRE"];

/**
 * Commandes sur mesure : nouvelle fonctionnalité, désactivée par défaut tant
 * qu'elle n'est pas explicitement activée depuis /admin/fonctionnalites —
 * voir la règle du memory "Feature rollout rule".
 */
export async function ensureCustomOrdersFlagRegistered() {
  await registerFeatureFlag(
    CUSTOM_ORDERS_FLAG,
    "Commandes sur mesure",
    "Suivi d'une pièce fabriquée à la demande (couture, menuiserie...) : spécifications du client, matière consommée, acompte et prix convenu, jusqu'à la livraison — pour ateliers artisanaux."
  );
}

export async function isCustomOrdersModuleEnabled(businessId: string): Promise<boolean> {
  await ensureCustomOrdersFlagRegistered();
  return isFeatureEnabled(CUSTOM_ORDERS_FLAG, businessId);
}

export type CustomOrderItemRow = { id: string; productId: string; productName: string; quantity: number; unitPrice: number; total: number };

export type CustomOrderListItem = {
  id: string;
  number: string;
  itemDescription: string;
  status: CustomOrderStatus;
  createdAt: string;
  deliveryDate: string | null;
  customer: { id: string; name: string; phone: string | null };
  total: number;
  amountPaid: number;
};

export type CustomOrderDetail = CustomOrderListItem & {
  specifications: string | null;
  agreedPrice: number;
  discount: number;
  paymentMethod: PaymentMethod | null;
  note: string | null;
  deliveredAt: string | null;
  technician: { id: string; firstName: string; lastName: string } | null;
  locationId: string;
  items: CustomOrderItemRow[];
};

const ORDER_FIELDS =
  "id, number, itemDescription:item_description, specifications, status, createdAt:created_at, deliveryDate:delivery_date, deliveredAt:delivered_at, agreedPrice:agreed_price, discount, amountPaid:amount_paid, paymentMethod:payment_method, note, locationId:location_id, customer:customers(id, name, phone), technician:users(id, firstName:first_name, lastName:last_name)";

async function fetchItemsByOrder(orderIds: string[]): Promise<Map<string, CustomOrderItemRow[]>> {
  const map = new Map<string, CustomOrderItemRow[]>();
  if (orderIds.length === 0) return map;
  const { data } = await supabase
    .from("custom_order_items")
    .select("id, customOrderId:custom_order_id, productId:product_id, quantity, unitPrice:unit_price, total, product:products(name)")
    .in("custom_order_id", orderIds);
  for (const row of (data ?? []) as unknown as Array<{
    id: string;
    customOrderId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    total: number;
    product: { name: string } | null;
  }>) {
    const list = map.get(row.customOrderId) ?? [];
    list.push({ id: row.id, productId: row.productId, productName: row.product?.name ?? "—", quantity: row.quantity, unitPrice: row.unitPrice, total: row.total });
    map.set(row.customOrderId, list);
  }
  return map;
}

function computeTotal(agreedPrice: number, discount: number, items: CustomOrderItemRow[]): number {
  return Math.max(0, agreedPrice - discount + items.reduce((s, i) => s + i.total, 0));
}

export async function getCustomOrdersAction(filters?: { status?: CustomOrderStatus }): Promise<CustomOrderListItem[]> {
  const user = await requirePermission(PERMISSIONS.CUSTOM_ORDERS_MANAGE);

  let q = supabase.from("custom_orders").select(ORDER_FIELDS).eq("business_id", user.businessId).order("created_at", { ascending: false });
  if (filters?.status) q = q.eq("status", filters.status);
  const { data } = await q;
  const orders = (data ?? []) as unknown as Array<Omit<CustomOrderDetail, "items" | "total">>;
  const itemsByOrder = await fetchItemsByOrder(orders.map((o) => o.id));

  return orders.map((o) => {
    const items = itemsByOrder.get(o.id) ?? [];
    return {
      id: o.id,
      number: o.number,
      itemDescription: o.itemDescription,
      status: o.status,
      createdAt: o.createdAt,
      deliveryDate: o.deliveryDate,
      customer: o.customer,
      total: computeTotal(o.agreedPrice, o.discount, items),
      amountPaid: o.amountPaid,
    };
  });
}

export async function getCustomOrderAction(id: string): Promise<CustomOrderDetail | null> {
  const user = await requirePermission(PERMISSIONS.CUSTOM_ORDERS_MANAGE);

  const { data } = await supabase.from("custom_orders").select(ORDER_FIELDS).eq("id", id).eq("business_id", user.businessId).maybeSingle();
  if (!data) return null;
  const order = data as unknown as Omit<CustomOrderDetail, "items" | "total">;
  const items = (await fetchItemsByOrder([id])).get(id) ?? [];

  return { ...order, items, total: computeTotal(order.agreedPrice, order.discount, items) };
}

export type ActionState = { error?: string; success?: string } | undefined;

const createSchema = z.object({
  locationId: z.string().min(1, "Choisissez une boutique"),
  customerId: z.string().min(1, "Choisissez un client"),
  itemDescription: z.string().min(1, "Décrivez la pièce à réaliser"),
  specifications: z.string().optional(),
  agreedPrice: z.coerce.number().min(0, "Prix invalide"),
  deliveryDate: z.string().optional(),
  technicianId: z.string().optional(),
  note: z.string().optional(),
});

export async function createCustomOrderAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CUSTOM_ORDERS_MANAGE);
  if (!(await isCustomOrdersModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = createSchema.safeParse({
    locationId: formData.get("locationId"),
    customerId: formData.get("customerId"),
    itemDescription: formData.get("itemDescription"),
    specifications: formData.get("specifications") || undefined,
    agreedPrice: formData.get("agreedPrice") || 0,
    deliveryDate: formData.get("deliveryDate") || undefined,
    technicianId: formData.get("technicianId") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const { data: location } = await supabase.from("locations").select("id").eq("id", data.locationId).eq("business_id", user.businessId).maybeSingle();
  if (!location) return { error: "Boutique introuvable" };
  const { data: customer } = await supabase.from("customers").select("id").eq("id", data.customerId).eq("business_id", user.businessId).maybeSingle();
  if (!customer) return { error: "Client introuvable" };

  const number = await generateCustomOrderNumber(user.businessId);
  const { data: order, error } = await supabase
    .from("custom_orders")
    .insert({
      business_id: user.businessId,
      location_id: data.locationId,
      number,
      customer_id: data.customerId,
      item_description: data.itemDescription,
      specifications: data.specifications ?? null,
      agreed_price: data.agreedPrice,
      delivery_date: data.deliveryDate || null,
      technician_id: data.technicianId || null,
      note: data.note ?? null,
      user_id: user.id,
    })
    .select("id")
    .single();
  if (error || !order) {
    console.error("[createCustomOrderAction] Échec de la création :", error?.message);
    return { error: "Impossible de créer la commande" };
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "CREATE", entity: "CustomOrder", entityId: order.id as string, details: number });

  revalidatePath("/commandes-sur-mesure");
  redirect(`/commandes-sur-mesure/${order.id}`);
}

const STATUS_TIMESTAMP_FIELD: Partial<Record<CustomOrderStatus, "delivered_at">> = { LIVRE: "delivered_at" };

export async function updateCustomOrderStatusAction(orderId: string, status: CustomOrderStatus): Promise<ActionState> {
  try {
    const user = await requirePermission(PERMISSIONS.CUSTOM_ORDERS_MANAGE);
    if (!(await isCustomOrdersModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

    const { data: order } = await supabase.from("custom_orders").select("id, status").eq("id", orderId).eq("business_id", user.businessId).maybeSingle();
    if (!order) return { error: "Commande introuvable" };
    if (order.status === "LIVRE" || order.status === "ANNULE") return { error: "Cette commande est déjà clôturée" };

    const timestampField = STATUS_TIMESTAMP_FIELD[status];
    const update: Record<string, unknown> = { status };
    if (timestampField) update[timestampField] = new Date().toISOString();

    const { error } = await supabase.from("custom_orders").update(update).eq("id", orderId);
    if (error) {
      console.error("[updateCustomOrderStatusAction] Échec :", error.message);
      return { error: "Impossible de mettre à jour le statut" };
    }

    revalidatePath("/commandes-sur-mesure");
    revalidatePath(`/commandes-sur-mesure/${orderId}`);
    return { success: `Statut : ${CUSTOM_ORDER_STATUS_LABELS[status]}` };
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[updateCustomOrderStatusAction] Erreur inattendue :", e);
    return { error: "Une erreur inattendue est survenue" };
  }
}

const detailsSchema = z.object({
  specifications: z.string().optional(),
  agreedPrice: z.coerce.number().min(0, "Montant invalide"),
  discount: z.coerce.number().min(0, "Remise invalide"),
  deliveryDate: z.string().optional(),
  technicianId: z.string().optional(),
});

export async function updateCustomOrderDetailsAction(orderId: string, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CUSTOM_ORDERS_MANAGE);
  if (!(await isCustomOrdersModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = detailsSchema.safeParse({
    specifications: formData.get("specifications") || undefined,
    agreedPrice: formData.get("agreedPrice") || 0,
    discount: formData.get("discount") || 0,
    deliveryDate: formData.get("deliveryDate") || undefined,
    technicianId: formData.get("technicianId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: order } = await supabase.from("custom_orders").select("id").eq("id", orderId).eq("business_id", user.businessId).maybeSingle();
  if (!order) return { error: "Commande introuvable" };

  const { error } = await supabase
    .from("custom_orders")
    .update({
      specifications: parsed.data.specifications ?? null,
      agreed_price: parsed.data.agreedPrice,
      discount: parsed.data.discount,
      delivery_date: parsed.data.deliveryDate || null,
      technician_id: parsed.data.technicianId || null,
    })
    .eq("id", orderId);
  if (error) {
    console.error("[updateCustomOrderDetailsAction] Échec :", error.message);
    return { error: "Impossible d'enregistrer" };
  }

  revalidatePath(`/commandes-sur-mesure/${orderId}`);
  return { success: "Enregistré" };
}

const addItemSchema = z.object({
  productId: z.string().min(1, "Choisissez une matière/fourniture"),
  quantity: z.coerce.number().int().positive("Quantité invalide"),
  unitPrice: z.coerce.number().min(0, "Prix invalide"),
});

export async function addCustomOrderItemAction(orderId: string, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CUSTOM_ORDERS_MANAGE);
  if (!(await isCustomOrdersModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = addItemSchema.safeParse({ productId: formData.get("productId"), quantity: formData.get("quantity"), unitPrice: formData.get("unitPrice") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const { data: order } = await supabase
    .from("custom_orders")
    .select("id, locationId:location_id, status, number")
    .eq("id", orderId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!order) return { error: "Commande introuvable" };
  if (order.status === "LIVRE" || order.status === "ANNULE") return { error: "Cette commande est déjà clôturée" };

  const { data: product } = await supabase.from("products").select("id").eq("id", data.productId).eq("business_id", user.businessId).maybeSingle();
  if (!product) return { error: "Produit introuvable" };

  const { oldStock, newStock } = await adjustStock({ productId: data.productId, locationId: order.locationId, delta: -data.quantity });

  const { error: itemError } = await supabase.from("custom_order_items").insert({
    custom_order_id: orderId,
    product_id: data.productId,
    quantity: data.quantity,
    unit_price: data.unitPrice,
    total: data.quantity * data.unitPrice,
  });
  if (itemError) {
    console.error("[addCustomOrderItemAction] Échec de l'enregistrement :", itemError.message);
    await adjustStock({ productId: data.productId, locationId: order.locationId, delta: data.quantity });
    return { error: "Impossible d'ajouter cette matière" };
  }

  const { error: movementError } = await supabase.from("stock_movements").insert({
    business_id: user.businessId,
    location_id: order.locationId,
    product_id: data.productId,
    direction: "OUT",
    reason: "REPARATION",
    quantity: data.quantity,
    old_stock: oldStock,
    new_stock: newStock,
    user_id: user.id,
    note: `Commande sur mesure ${order.number}`,
  });
  if (movementError) console.error("[addCustomOrderItemAction] Échec de l'écriture du mouvement de stock :", movementError.message);

  revalidatePath(`/commandes-sur-mesure/${orderId}`);
  revalidatePath("/produits");
  return { success: "Matière ajoutée" };
}

export async function removeCustomOrderItemAction(itemId: string): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CUSTOM_ORDERS_MANAGE);
  if (!(await isCustomOrdersModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const { data: item } = await supabase
    .from("custom_order_items")
    .select("id, productId:product_id, quantity, customOrder:custom_orders!inner(id, businessId:business_id, locationId:location_id, number, status)")
    .eq("id", itemId)
    .maybeSingle();
  const order = (item?.customOrder as unknown as { id: string; businessId: string; locationId: string; number: string; status: CustomOrderStatus } | undefined) ?? undefined;
  if (!item || !order || order.businessId !== user.businessId) return { error: "Matière introuvable" };
  if (order.status === "LIVRE" || order.status === "ANNULE") return { error: "Cette commande est déjà clôturée" };

  const { error: deleteError } = await supabase.from("custom_order_items").delete().eq("id", itemId);
  if (deleteError) {
    console.error("[removeCustomOrderItemAction] Échec de la suppression :", deleteError.message);
    return { error: "Impossible de retirer cette matière" };
  }

  const { oldStock, newStock } = await adjustStock({ productId: item.productId, locationId: order.locationId, delta: item.quantity });
  const { error: movementError } = await supabase.from("stock_movements").insert({
    business_id: user.businessId,
    location_id: order.locationId,
    product_id: item.productId,
    direction: "IN",
    reason: "REPARATION",
    quantity: item.quantity,
    old_stock: oldStock,
    new_stock: newStock,
    user_id: user.id,
    note: `Retrait matière — commande sur mesure ${order.number}`,
  });
  if (movementError) console.error("[removeCustomOrderItemAction] Échec de l'écriture du mouvement de stock :", movementError.message);

  revalidatePath(`/commandes-sur-mesure/${order.id}`);
  revalidatePath("/produits");
  return { success: "Matière retirée" };
}

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Montant invalide"),
  method: z.enum(["ESPECES", "MOBILE_MONEY", "CARTE", "AUTRE"]),
});

export async function recordCustomOrderPaymentAction(orderId: string, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.CUSTOM_ORDERS_MANAGE);
  if (!(await isCustomOrdersModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = paymentSchema.safeParse({ amount: formData.get("amount"), method: formData.get("method") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const order = await getCustomOrderAction(orderId);
  if (!order) return { error: "Commande introuvable" };

  const remaining = order.total - order.amountPaid;
  if (remaining <= 0) return { error: "Cette commande est déjà réglée intégralement" };
  const amountPaid = order.amountPaid + Math.min(parsed.data.amount, remaining);

  const { error } = await supabase.from("custom_orders").update({ amount_paid: amountPaid, payment_method: parsed.data.method }).eq("id", orderId);
  if (error) {
    console.error("[recordCustomOrderPaymentAction] Échec :", error.message);
    return { error: "Impossible d'enregistrer le paiement (acompte)" };
  }

  revalidatePath(`/commandes-sur-mesure/${orderId}`);
  revalidatePath("/commandes-sur-mesure");
  return { success: "Paiement enregistré" };
}

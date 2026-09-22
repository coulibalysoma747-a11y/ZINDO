"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generateTableOrderNumber } from "@/lib/reference";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { TABLES_FLAG } from "@/lib/nav";
import { createSaleAction, type CartItemInput } from "@/lib/actions/sales";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";
import type { TableStatus, TableOrderStatus, PaymentMethod } from "@/lib/db-types";

export type ActionState = { error?: string; success?: string } | undefined;

/**
 * Gestion des tables : nouvelle fonctionnalité, désactivée par défaut tant
 * qu'elle n'est pas explicitement activée depuis /admin/fonctionnalites —
 * voir la règle du memory "Feature rollout rule".
 */
export async function ensureTablesFlagRegistered() {
  await registerFeatureFlag(
    TABLES_FLAG,
    "Gestion des tables",
    "Ouvrir un compte par table pour ajouter les commandes au fil du service (boissons, plats), imprimer l'addition puis encaisser en une fois à la fin — pour restaurants/maquis et bars/buvettes."
  );
}

export async function isTablesModuleEnabled(businessId: string): Promise<boolean> {
  await ensureTablesFlagRegistered();
  return isFeatureEnabled(TABLES_FLAG, businessId);
}

export type TableRow = {
  id: string;
  name: string;
  status: TableStatus;
  openOrder: { id: string; number: string; total: number; openedAt: string } | null;
};

async function fetchOpenOrderTotals(orderIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (orderIds.length === 0) return map;
  const { data } = await supabase.from("table_order_items").select("tableOrderId:table_order_id, quantity, unitPrice:unit_price").in("table_order_id", orderIds);
  for (const row of (data ?? []) as unknown as Array<{ tableOrderId: string; quantity: number; unitPrice: number }>) {
    map.set(row.tableOrderId, (map.get(row.tableOrderId) ?? 0) + row.quantity * row.unitPrice);
  }
  return map;
}

export async function getTablesAction(locationId: string): Promise<TableRow[]> {
  const user = await requirePermission(PERMISSIONS.TABLES_MANAGE);

  const { data: tables } = await supabase
    .from("restaurant_tables")
    .select("id, name, status")
    .eq("business_id", user.businessId)
    .eq("location_id", locationId)
    .order("name", { ascending: true });
  const rows = (tables ?? []) as unknown as Array<{ id: string; name: string; status: TableStatus }>;
  if (rows.length === 0) return [];

  const { data: openOrders } = await supabase
    .from("table_orders")
    .select("id, tableId:table_id, number, openedAt:opened_at")
    .eq("business_id", user.businessId)
    .in("table_id", rows.map((t) => t.id))
    .eq("status", "OUVERTE");
  const orders = (openOrders ?? []) as unknown as Array<{ id: string; tableId: string; number: string; openedAt: string }>;
  const totals = await fetchOpenOrderTotals(orders.map((o) => o.id));
  const orderByTable = new Map(orders.map((o) => [o.tableId, o]));

  return rows.map((t) => {
    const order = orderByTable.get(t.id);
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      openOrder: order ? { id: order.id, number: order.number, total: totals.get(order.id) ?? 0, openedAt: order.openedAt } : null,
    };
  });
}

const createTableSchema = z.object({ name: z.string().min(1, "Le nom de la table est requis"), locationId: z.string().min(1) });

export async function createTableAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.TABLES_MANAGE);
  const parsed = createTableSchema.safeParse({ name: formData.get("name"), locationId: formData.get("locationId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { data: existing } = await supabase
    .from("restaurant_tables")
    .select("id")
    .eq("location_id", parsed.data.locationId)
    .eq("name", parsed.data.name)
    .maybeSingle();
  if (existing) return { error: "Une table porte déjà ce nom dans cette boutique" };

  const { error } = await supabase.from("restaurant_tables").insert({
    business_id: user.businessId,
    location_id: parsed.data.locationId,
    name: parsed.data.name,
  });
  if (error) {
    console.error("[createTableAction] Échec de la création :", error.message);
    return { error: "Impossible de créer la table" };
  }

  revalidatePath("/tables");
  return { success: "Table ajoutée" };
}

export async function deleteTableAction(tableId: string): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.TABLES_MANAGE);
  const { data: table } = await supabase.from("restaurant_tables").select("id, status").eq("id", tableId).eq("business_id", user.businessId).maybeSingle();
  if (!table) return { error: "Table introuvable" };
  if (table.status === "OCCUPEE") return { error: "Fermez le compte en cours avant de supprimer cette table" };

  const { error } = await supabase.from("restaurant_tables").delete().eq("id", tableId);
  if (error) {
    console.error("[deleteTableAction] Échec de la suppression :", error.message);
    return { error: "Impossible de supprimer la table" };
  }

  revalidatePath("/tables");
  return { success: "Table supprimée" };
}

export type TableOrderItemRow = { id: string; productId: string; productName: string; quantity: number; unitPrice: number; note: string | null; total: number };

export type TableOrderDetail = {
  id: string;
  number: string;
  status: TableOrderStatus;
  locationId: string;
  customer: { id: string; name: string } | null;
  openedAt: string;
  items: TableOrderItemRow[];
  total: number;
};

async function fetchOpenOrderForTable(businessId: string, tableId: string) {
  const { data } = await supabase
    .from("table_orders")
    .select("id, number, status, locationId:location_id, openedAt:opened_at, customer:customers(id, name)")
    .eq("business_id", businessId)
    .eq("table_id", tableId)
    .eq("status", "OUVERTE")
    .maybeSingle();
  return data as unknown as Omit<TableOrderDetail, "items" | "total"> | null;
}

export async function getTableOrderAction(tableId: string): Promise<TableOrderDetail | null> {
  const user = await requirePermission(PERMISSIONS.TABLES_MANAGE);
  const order = await fetchOpenOrderForTable(user.businessId, tableId);
  if (!order) return null;

  const { data: itemRows } = await supabase
    .from("table_order_items")
    .select("id, productId:product_id, quantity, unitPrice:unit_price, note, product:products(name)")
    .eq("table_order_id", order.id)
    .order("created_at", { ascending: true });
  const items = ((itemRows ?? []) as unknown as Array<{ id: string; productId: string; quantity: number; unitPrice: number; note: string | null; product: { name: string } | null }>).map(
    (i) => ({ id: i.id, productId: i.productId, productName: i.product?.name ?? "—", quantity: i.quantity, unitPrice: i.unitPrice, note: i.note, total: i.quantity * i.unitPrice })
  );

  return { ...order, items, total: items.reduce((s, i) => s + i.total, 0) };
}

export async function openTableOrderAction(tableId: string, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.TABLES_MANAGE);
  if (!(await isTablesModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const { data: table } = await supabase.from("restaurant_tables").select("id, locationId:location_id, status").eq("id", tableId).eq("business_id", user.businessId).maybeSingle();
  if (!table) return { error: "Table introuvable" };
  if (table.status === "OCCUPEE") return { error: "Cette table a déjà un compte ouvert" };

  const customerId = (formData.get("customerId") as string) || null;
  const number = await generateTableOrderNumber(user.businessId);

  const { error: orderError } = await supabase.from("table_orders").insert({
    business_id: user.businessId,
    location_id: table.locationId,
    table_id: tableId,
    number,
    customer_id: customerId,
    user_id: user.id,
  });
  if (orderError) {
    console.error("[openTableOrderAction] Échec de la création :", orderError.message);
    return { error: "Impossible d'ouvrir un compte pour cette table" };
  }

  const { error: tableError } = await supabase.from("restaurant_tables").update({ status: "OCCUPEE" }).eq("id", tableId);
  if (tableError) console.error("[openTableOrderAction] Échec de la mise à jour de la table :", tableError.message);

  revalidatePath("/tables");
  revalidatePath(`/tables/${tableId}`);
  return { success: "Compte ouvert" };
}

const addItemSchema = z.object({
  productId: z.string().min(1, "Choisissez un produit"),
  quantity: z.coerce.number().int().positive("Quantité invalide"),
  unitPrice: z.coerce.number().min(0, "Prix invalide"),
  note: z.string().optional(),
});

export async function addTableOrderItemAction(tableId: string, formData: FormData): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.TABLES_MANAGE);
  if (!(await isTablesModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

  const parsed = addItemSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const order = await fetchOpenOrderForTable(user.businessId, tableId);
  if (!order) return { error: "Aucun compte ouvert pour cette table" };

  const { data: product } = await supabase.from("products").select("id").eq("id", parsed.data.productId).eq("business_id", user.businessId).maybeSingle();
  if (!product) return { error: "Produit introuvable" };

  const { error } = await supabase.from("table_order_items").insert({
    table_order_id: order.id,
    product_id: parsed.data.productId,
    quantity: parsed.data.quantity,
    unit_price: parsed.data.unitPrice,
    note: parsed.data.note ?? null,
  });
  if (error) {
    console.error("[addTableOrderItemAction] Échec de l'ajout :", error.message);
    return { error: "Impossible d'ajouter cet article" };
  }

  revalidatePath(`/tables/${tableId}`);
  revalidatePath("/tables");
  return { success: "Article ajouté" };
}

export async function removeTableOrderItemAction(itemId: string): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.TABLES_MANAGE);

  const { data: item } = await supabase
    .from("table_order_items")
    .select("id, tableOrder:table_orders!inner(id, businessId:business_id, tableId:table_id, status)")
    .eq("id", itemId)
    .maybeSingle();
  const order = (item?.tableOrder as unknown as { id: string; businessId: string; tableId: string; status: string } | undefined) ?? undefined;
  if (!item || !order || order.businessId !== user.businessId) return { error: "Article introuvable" };
  if (order.status !== "OUVERTE") return { error: "Ce compte est déjà clôturé" };

  const { error } = await supabase.from("table_order_items").delete().eq("id", itemId);
  if (error) {
    console.error("[removeTableOrderItemAction] Échec de la suppression :", error.message);
    return { error: "Impossible de retirer cet article" };
  }

  revalidatePath(`/tables/${order.tableId}`);
  revalidatePath("/tables");
  return { success: "Article retiré" };
}

export async function cancelTableOrderAction(tableId: string): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.TABLES_MANAGE);
  const order = await fetchOpenOrderForTable(user.businessId, tableId);
  if (!order) return { error: "Aucun compte ouvert pour cette table" };

  const { error: orderError } = await supabase.from("table_orders").update({ status: "ANNULEE", closed_at: new Date().toISOString() }).eq("id", order.id);
  if (orderError) {
    console.error("[cancelTableOrderAction] Échec :", orderError.message);
    return { error: "Impossible d'annuler ce compte" };
  }

  const { error: tableError } = await supabase.from("restaurant_tables").update({ status: "LIBRE" }).eq("id", tableId);
  if (tableError) console.error("[cancelTableOrderAction] Échec de la mise à jour de la table :", tableError.message);

  revalidatePath("/tables");
  revalidatePath(`/tables/${tableId}`);
  return { success: "Compte annulé" };
}

const closeSchema = z.object({
  customerId: z.string().optional(),
  discount: z.coerce.number().min(0, "Remise invalide"),
  paymentMethod: z.enum(["ESPECES", "MOBILE_MONEY", "CARTE", "CREDIT", "AUTRE"]),
  amountPaid: z.coerce.number().min(0, "Montant invalide"),
  mobileMoneyOperator: z.enum(["ORANGE", "MOOV", "WAVE"]).optional(),
});

export async function closeTableOrderAction(tableId: string, formData: FormData): Promise<ActionState> {
  try {
    const user = await requirePermission(PERMISSIONS.TABLES_MANAGE);
    if (!(await isTablesModuleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

    const parsed = closeSchema.safeParse({
      customerId: formData.get("customerId") || undefined,
      discount: formData.get("discount") || 0,
      paymentMethod: formData.get("paymentMethod"),
      amountPaid: formData.get("amountPaid"),
      mobileMoneyOperator: formData.get("mobileMoneyOperator") || undefined,
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    const order = await getTableOrderAction(tableId);
    if (!order) return { error: "Aucun compte ouvert pour cette table" };
    if (order.items.length === 0) return { error: "Ajoutez au moins un article avant d'encaisser" };

    const items: CartItemInput[] = order.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discount: 0 }));

    const saleResult = await createSaleAction({
      locationId: order.locationId,
      items,
      customerId: parsed.data.customerId || order.customer?.id,
      discount: parsed.data.discount,
      paymentMethod: parsed.data.paymentMethod as PaymentMethod,
      amountPaid: parsed.data.amountPaid,
      mobileMoneyOperator: parsed.data.mobileMoneyOperator,
      note: `Table — ${order.number}`,
    });
    if (!saleResult.success) return { error: saleResult.error };

    const { error: orderError } = await supabase
      .from("table_orders")
      .update({ status: "ENCAISSEE", sale_id: saleResult.saleId, closed_at: new Date().toISOString() })
      .eq("id", order.id);
    if (orderError) console.error("[closeTableOrderAction] Échec de la clôture du compte :", orderError.message);

    const { error: tableError } = await supabase.from("restaurant_tables").update({ status: "LIBRE" }).eq("id", tableId);
    if (tableError) console.error("[closeTableOrderAction] Échec de la mise à jour de la table :", tableError.message);

    await logAction({ businessId: user.businessId, userId: user.id, action: "UPDATE", entity: "TableOrder", entityId: order.id, details: `Encaissé — vente ${saleResult.saleId}` });

    revalidatePath("/tables");
    revalidatePath(`/tables/${tableId}`);
    return { success: "Compte encaissé" };
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[closeTableOrderAction] Erreur inattendue :", e);
    return { error: "Une erreur inattendue est survenue" };
  }
}

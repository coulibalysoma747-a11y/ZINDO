"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import type { CartItemInput } from "@/lib/actions/sales";

export type SendCartToQueueInput = {
  locationId: string;
  items: CartItemInput[];
  customerId?: string;
  discount: number;
  note?: string;
};

/**
 * "Caisse à deux" (Paramètres) : un vendeur envoie son panier ici, SANS
 * encaisser ni toucher au stock — un caissier le récupérera ensuite (voir
 * claimPendingCartAction) et finalisera via le circuit de vente normal.
 */
export async function sendCartToQueueAction(input: SendCartToQueueInput): Promise<{ error?: string; id?: string }> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  if (!input.items || input.items.length === 0) return { error: "Le panier est vide" };

  const { data: cart, error } = await supabase
    .from("pending_carts")
    .insert({
      business_id: user.businessId,
      location_id: input.locationId,
      created_by: user.id,
      customer_id: input.customerId || null,
      discount: input.discount,
      note: input.note ?? null,
    })
    .select("id")
    .single();
  if (error || !cart) {
    console.error("[sendCartToQueueAction] Échec de la création :", error?.message);
    return { error: "Impossible d'envoyer le panier à la caisse" };
  }

  const { error: itemsError } = await supabase.from("pending_cart_items").insert(
    input.items.map((i) => ({
      pending_cart_id: cart.id as string,
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      discount: i.discount,
      packaging_unit_id: i.packagingUnitId ?? null,
      multiplier: i.multiplier ?? 1,
      unit_label: i.packagingLabel ?? null,
      vehicle_unit_id: i.vehicleUnitId ?? null,
    }))
  );
  if (itemsError) {
    console.error("[sendCartToQueueAction] Échec de l'enregistrement des articles :", itemsError.message);
    await supabase.from("pending_carts").delete().eq("id", cart.id as string);
    return { error: "Impossible d'envoyer le panier à la caisse" };
  }

  revalidatePath("/ventes");
  return { id: cart.id as string };
}

export type PendingCartSummary = {
  id: string;
  createdAt: string;
  createdByName: string;
  customerName: string | null;
  itemCount: number;
  total: number;
};

export async function getPendingCartsAction(locationId: string): Promise<PendingCartSummary[]> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  const { data } = await supabase
    .from("pending_carts")
    .select(
      "id, createdAt:created_at, createdBy:users(firstName:first_name, lastName:last_name), customer:customers(name), items:pending_cart_items(quantity, unitPrice:unit_price, discount)"
    )
    .eq("business_id", user.businessId)
    .eq("location_id", locationId)
    .order("created_at", { ascending: true });

  return ((data ?? []) as unknown as Array<{
    id: string;
    createdAt: string;
    createdBy: { firstName: string; lastName: string };
    customer: { name: string } | null;
    items: Array<{ quantity: number; unitPrice: number; discount: number }>;
  }>).map((c) => ({
    id: c.id,
    createdAt: c.createdAt,
    createdByName: `${c.createdBy.firstName} ${c.createdBy.lastName}`,
    customerName: c.customer?.name ?? null,
    itemCount: c.items.length,
    total: c.items.reduce((s, i) => s + i.unitPrice * i.quantity - i.discount, 0),
  }));
}

export type ClaimedCart = {
  customerId: string | null;
  discount: number;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    packagingUnitId: string | null;
    unitLabel: string | null;
    multiplier: number;
    vehicleUnitId: string | null;
  }>;
};

export type ClaimPendingCartResult = { error: string } | { cart: ClaimedCart };

/**
 * Récupère un panier de la file et le retire immédiatement (suppression) pour
 * qu'il ne puisse pas être récupéré deux fois par deux caissiers différents.
 */
export async function claimPendingCartAction(id: string): Promise<ClaimPendingCartResult> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  const { data: cartRow } = await supabase
    .from("pending_carts")
    .select("id, customerId:customer_id, discount")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!cartRow) return { error: "Ce panier a déjà été récupéré ou n'existe plus" };

  const { data: items } = await supabase
    .from("pending_cart_items")
    .select(
      "productId:product_id, quantity, unitPrice:unit_price, discount, packagingUnitId:packaging_unit_id, unitLabel:unit_label, multiplier, vehicleUnitId:vehicle_unit_id"
    )
    .eq("pending_cart_id", id);

  const { error: deleteError, count } = await supabase
    .from("pending_carts")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("business_id", user.businessId);
  if (deleteError || !count) {
    return { error: "Ce panier vient d'être récupéré par un autre caissier" };
  }

  revalidatePath("/ventes");
  return {
    cart: {
      customerId: cartRow.customerId as string | null,
      discount: cartRow.discount as number,
      items: (items ?? []) as unknown as ClaimedCart["items"],
    },
  };
}

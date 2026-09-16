"use server";

import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { generateOnlineOrderNumber } from "@/lib/reference";
import { isFeatureEnabled } from "@/lib/feature-flags";

const itemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const orderSchema = z.object({
  slug: z.string().min(1),
  customerName: z.string().min(1, "Votre nom est requis"),
  customerPhone: z.string().min(6, "Un numéro de téléphone valide est requis"),
  deliveryAddress: z.string().optional(),
  wantsDelivery: z.boolean(),
  note: z.string().optional(),
  items: z.array(itemSchema).min(1, "Le panier est vide"),
});

export type CreateOnlineOrderInput = z.infer<typeof orderSchema>;
export type CreateOnlineOrderResult =
  | { success: true; orderNumber: string }
  | { success: false; error: string };

/** Aucune authentification : appelée depuis la page publique /boutique/[slug]. */
export async function createOnlineOrderAction(
  input: CreateOnlineOrderInput
): Promise<CreateOnlineOrderResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const data = parsed.data;

  const { data: store } = await supabase
    .from("online_stores")
    .select(
      "id, businessId:business_id, published, locationId:location_id, deliveryEnabled:delivery_enabled, deliveryFee:delivery_fee, freeDeliveryAbove:free_delivery_above, minOrderAmount:min_order_amount"
    )
    .eq("slug", data.slug)
    .maybeSingle();
  if (!store || !store.published || !store.locationId) {
    return { success: false, error: "Cette boutique n'est pas disponible" };
  }

  const enabled = await isFeatureEnabled("boutique_en_ligne", store.businessId as string);
  if (!enabled) return { success: false, error: "Cette boutique n'est pas disponible" };

  if (data.wantsDelivery && !data.deliveryAddress) {
    return { success: false, error: "Indiquez une adresse de livraison" };
  }

  const productIds = data.items.map((i) => i.productId);
  const [{ data: products }, { data: stocks }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, salePrice:sale_price")
      .in("id", productIds)
      .eq("business_id", store.businessId as string)
      .eq("active", true),
    supabase
      .from("product_stocks")
      .select("productId:product_id, quantity")
      .in("product_id", productIds)
      .eq("location_id", store.locationId as string),
  ]);
  const productMap = new Map(
    ((products ?? []) as Array<{ id: string; name: string; salePrice: number }>).map((p) => [p.id, p])
  );
  const stockMap = new Map(((stocks ?? []) as Array<{ productId: string; quantity: number }>).map((s) => [s.productId, s.quantity]));

  let subtotal = 0;
  const orderItems: { product_id: string; quantity: number; unit_price: number; total: number }[] = [];
  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product) return { success: false, error: "Un article du panier n'est plus disponible" };
    const available = stockMap.get(item.productId) ?? 0;
    if (item.quantity > available) {
      return { success: false, error: `Stock insuffisant pour "${product.name}" (disponible : ${available})` };
    }
    const total = product.salePrice * item.quantity;
    subtotal += total;
    orderItems.push({ product_id: item.productId, quantity: item.quantity, unit_price: product.salePrice, total });
  }

  const minOrderAmount = (store.minOrderAmount as number | null) ?? 0;
  if (minOrderAmount > 0 && subtotal < minOrderAmount) {
    return { success: false, error: `Commande minimum non atteinte (minimum : ${minOrderAmount})` };
  }

  let deliveryFee = 0;
  if (data.wantsDelivery && store.deliveryEnabled) {
    const freeThreshold = store.freeDeliveryAbove as number | null;
    deliveryFee = freeThreshold != null && subtotal >= freeThreshold ? 0 : (store.deliveryFee as number);
  }
  const total = subtotal + deliveryFee;

  const number = await generateOnlineOrderNumber(store.businessId as string);

  const { data: order, error: orderError } = await supabase
    .from("online_orders")
    .insert({
      store_id: store.id,
      number,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      delivery_address: data.wantsDelivery ? data.deliveryAddress : null,
      wants_delivery: data.wantsDelivery,
      note: data.note ?? null,
      subtotal,
      delivery_fee: deliveryFee,
      total,
    })
    .select("id")
    .single();
  if (orderError || !order) {
    console.error("[createOnlineOrderAction] Échec de la création :", orderError?.message);
    return { success: false, error: "Impossible d'enregistrer la commande" };
  }

  const { error: itemsError } = await supabase
    .from("online_order_items")
    .insert(orderItems.map((i) => ({ ...i, order_id: order.id })));
  if (itemsError) {
    console.error("[createOnlineOrderAction] Échec de l'enregistrement des articles :", itemsError.message);
    return { success: false, error: "Impossible d'enregistrer les articles de la commande" };
  }

  return { success: true, orderNumber: number };
}

"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
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

  const store = await prisma.onlineStore.findUnique({ where: { slug: data.slug } });
  if (!store || !store.published || !store.locationId) {
    return { success: false, error: "Cette boutique n'est pas disponible" };
  }

  const enabled = await isFeatureEnabled("boutique_en_ligne", store.businessId);
  if (!enabled) return { success: false, error: "Cette boutique n'est pas disponible" };

  if (data.wantsDelivery && !data.deliveryAddress) {
    return { success: false, error: "Indiquez une adresse de livraison" };
  }

  const productIds = data.items.map((i) => i.productId);
  const [products, stocks] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds }, businessId: store.businessId, active: true } }),
    prisma.productStock.findMany({ where: { productId: { in: productIds }, locationId: store.locationId } }),
  ]);
  const productMap = new Map(products.map((p) => [p.id, p]));
  const stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));

  let subtotal = 0;
  const orderItems: { productId: string; quantity: number; unitPrice: number; total: number }[] = [];
  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product) return { success: false, error: "Un article du panier n'est plus disponible" };
    const available = stockMap.get(item.productId) ?? 0;
    if (item.quantity > available) {
      return { success: false, error: `Stock insuffisant pour "${product.name}" (disponible : ${available})` };
    }
    const total = product.salePrice * item.quantity;
    subtotal += total;
    orderItems.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.salePrice, total });
  }

  let deliveryFee = 0;
  if (data.wantsDelivery && store.deliveryEnabled) {
    const freeThreshold = store.freeDeliveryAbove;
    deliveryFee = freeThreshold != null && subtotal >= freeThreshold ? 0 : store.deliveryFee;
  }
  const total = subtotal + deliveryFee;

  const number = await generateOnlineOrderNumber(store.businessId);

  await prisma.onlineOrder.create({
    data: {
      storeId: store.id,
      number,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      deliveryAddress: data.wantsDelivery ? data.deliveryAddress : null,
      wantsDelivery: data.wantsDelivery,
      note: data.note,
      subtotal,
      deliveryFee,
      total,
      items: { create: orderItems },
    },
  });

  return { success: true, orderNumber: number };
}

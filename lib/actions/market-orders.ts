"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentBuyer } from "@/lib/market-buyer";
import { isMarketEnabledFor, loadMarketProducts, loadPublishedShops } from "@/lib/market-data";
import { MARKET_ORDER_STEPS, marketOrderStatusLabel, normalizeBuyerPhone, type MarketOrderStatus } from "@/lib/market";
import { createSaleAction, recordStockMovements } from "@/lib/actions/sales";

/**
 * Commandes du Marché (flag nouveau_marche). Le stock sort à la confirmation
 * (motif COMMANDE_MARCHE) ; à « Livrée », il est remis puis aussitôt revendu
 * par une vraie vente, pour que l'argent entre en caisse sans double sortie.
 */

export type CartLine = { productId: string; quantity: number };

export type CartShop = {
  shopId: string;
  slug: string;
  name: string;
  deliveryEnabled: boolean;
  deliveryFee: number;
  deliveryNote: string | null;
  pickupEnabled: boolean;
  payOnDelivery: boolean;
  payOnPickup: boolean;
  mobileMoneyEnabled: boolean;
  orangeMoneyNumber: string | null;
  moovMoneyNumber: string | null;
  address: string | null;
  city: string | null;
  items: { productId: string; name: string; photoUrl: string | null; unitPrice: number; available: number; quantity: number }[];
};

type ShopSettingsRow = Omit<CartShop, "slug" | "name" | "items" | "address" | "city"> & { id: string };

const SHOP_SETTINGS =
  "id, deliveryEnabled:delivery_enabled, deliveryFee:delivery_fee, deliveryNote:delivery_note, pickupEnabled:pickup_enabled, payOnDelivery:pay_on_delivery, payOnPickup:pay_on_pickup, mobileMoneyEnabled:mobile_money_enabled, orangeMoneyNumber:orange_money_number, moovMoneyNumber:moov_money_number";

const cartSchema = z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive().max(10000) })).max(100);

/** Contenu du panier regroupé par boutique, avec prix et stock lus en direct. */
export async function getCartDetailsAction(lines: CartLine[]): Promise<CartShop[]> {
  const parsed = cartSchema.safeParse(lines);
  if (!parsed.success || parsed.data.length === 0) return [];
  const shops = await loadPublishedShops();
  const products = await loadMarketProducts({ shops, productIds: parsed.data.map((l) => l.productId), limit: 100 });
  if (products.length === 0) return [];

  const shopIds = [...new Set(products.map((p) => shops.find((s) => s.slug === p.shop.slug)!.id))];
  const { data: settingsData } = await supabase.from("market_shops").select(SHOP_SETTINGS).in("id", shopIds);
  const settings = new Map(((settingsData ?? []) as unknown as ShopSettingsRow[]).map((s) => [s.id, s]));

  const result = new Map<string, CartShop>();
  for (const line of parsed.data) {
    const product = products.find((p) => p.productId === line.productId);
    if (!product) continue;
    const shop = shops.find((s) => s.slug === product.shop.slug)!;
    const setting = settings.get(shop.id);
    if (!setting) continue;
    if (!result.has(shop.id)) {
      const { id: _id, ...rest } = setting;
      void _id;
      result.set(shop.id, { ...rest, shopId: shop.id, slug: shop.slug, name: shop.name, address: shop.address, city: shop.city, items: [] });
    }
    result.get(shop.id)!.items.push({
      productId: product.productId,
      name: product.name,
      photoUrl: product.photoUrl,
      unitPrice: product.promoPrice ?? product.price,
      available: product.available,
      quantity: line.quantity,
    });
  }
  return [...result.values()];
}

const orderSchema = z.object({
  customerName: z.string().trim().min(2, "Indiquez votre nom").max(80),
  customerPhone: z.string().trim().min(8, "Numéro de téléphone invalide"),
  address: z.string().trim().max(200).optional(),
  city: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500).optional(),
  lines: cartSchema.min(1, "Votre panier est vide"),
  shops: z
    .array(
      z.object({
        shopId: z.string().min(1),
        deliveryMode: z.enum(["LIVRAISON", "RETRAIT"]),
        paymentMethod: z.enum(["A_LA_LIVRAISON", "AU_RETRAIT", "MOBILE_MONEY"]),
        mobileMoneyOperator: z.enum(["ORANGE", "MOOV"]).optional(),
        mobileMoneyReference: z.string().trim().max(60).optional(),
      })
    )
    .min(1),
});

export type PlaceOrderInput = z.infer<typeof orderSchema>;

/** Crée une commande par boutique du panier. Les prix et le stock sont revérifiés ici. */
export async function placeMarketOrdersAction(input: PlaceOrderInput): Promise<{ error?: string; numbers?: string[] }> {
  const buyer = await getCurrentBuyer();
  if (!buyer) return { error: "Connectez-vous pour commander." };
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Commande invalide" };
  const d = parsed.data;
  const phone = normalizeBuyerPhone(d.customerPhone);
  if (!phone) return { error: "Numéro de téléphone invalide" };

  const cart = await getCartDetailsAction(d.lines);
  if (cart.length === 0) return { error: "Ces produits ne sont plus disponibles." };

  // Tout est vérifié avant de créer quoi que ce soit.
  const plans = [];
  for (const shop of cart) {
    const choice = d.shops.find((s) => s.shopId === shop.shopId);
    if (!choice) return { error: `Choisissez la livraison et le paiement pour ${shop.name}.` };
    if (choice.deliveryMode === "LIVRAISON" && !shop.deliveryEnabled) return { error: `${shop.name} ne livre pas : choisissez le retrait.` };
    if (choice.deliveryMode === "RETRAIT" && !shop.pickupEnabled) return { error: `${shop.name} ne propose pas le retrait.` };
    if (choice.deliveryMode === "LIVRAISON" && !d.address) return { error: "Indiquez votre adresse de livraison." };
    const paymentOk =
      (choice.paymentMethod === "A_LA_LIVRAISON" && shop.payOnDelivery && choice.deliveryMode === "LIVRAISON") ||
      (choice.paymentMethod === "AU_RETRAIT" && shop.payOnPickup && choice.deliveryMode === "RETRAIT") ||
      (choice.paymentMethod === "MOBILE_MONEY" && shop.mobileMoneyEnabled);
    if (!paymentOk) return { error: `Moyen de paiement non proposé par ${shop.name}.` };
    if (choice.paymentMethod === "MOBILE_MONEY" && (!choice.mobileMoneyOperator || !choice.mobileMoneyReference)) {
      return { error: "Indiquez l'opérateur et la référence de votre transfert Mobile Money." };
    }
    for (const item of shop.items) {
      if (item.quantity > item.available) {
        return { error: item.available > 0 ? `${item.name} : il n'en reste que ${item.available}.` : `${item.name} est en rupture de stock.` };
      }
    }
    const subtotal = shop.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const deliveryFee = choice.deliveryMode === "LIVRAISON" ? shop.deliveryFee : 0;
    plans.push({ shop, choice, subtotal, deliveryFee });
  }

  const { data: shopRows } = await supabase.from("market_shops").select("id, businessId:business_id").in("id", plans.map((p) => p.shop.shopId));
  const businessOf = new Map((shopRows ?? []).map((s) => [s.id as string, s.businessId as string]));

  const numbers: string[] = [];
  for (const { shop, choice, subtotal, deliveryFee } of plans) {
    const { data: order, error } = await supabase
      .from("market_orders")
      .insert({
        shop_id: shop.shopId,
        business_id: businessOf.get(shop.shopId),
        buyer_id: buyer.id,
        delivery_mode: choice.deliveryMode,
        customer_name: d.customerName,
        customer_phone: phone,
        delivery_address: choice.deliveryMode === "LIVRAISON" ? d.address : null,
        delivery_city: choice.deliveryMode === "LIVRAISON" ? d.city ?? null : null,
        payment_method: choice.paymentMethod,
        mobile_money_operator: choice.paymentMethod === "MOBILE_MONEY" ? choice.mobileMoneyOperator : null,
        mobile_money_reference: choice.paymentMethod === "MOBILE_MONEY" ? choice.mobileMoneyReference : null,
        subtotal,
        delivery_fee: deliveryFee,
        total: subtotal + deliveryFee,
        buyer_note: d.note ?? null,
      })
      .select("id, number")
      .single();
    if (error || !order) {
      console.error("[placeMarketOrdersAction]", error?.message);
      return { error: numbers.length ? `Seules les commandes ${numbers.join(", ")} ont été enregistrées.` : "Commande impossible, réessayez." };
    }
    await supabase.from("market_order_items").insert(
      shop.items.map((i) => ({ order_id: order.id, product_id: i.productId, name: i.name, photo_url: i.photoUrl, unit_price: i.unitPrice, quantity: i.quantity }))
    );
    await supabase.from("market_order_events").insert({ order_id: order.id, status: "RECUE" });
    numbers.push(order.number);
  }
  revalidatePath("/marche/commandes");
  return { numbers };
}

/** L'acheteur peut annuler tant que le vendeur n'a pas confirmé. */
export async function cancelMyMarketOrderAction(orderId: string): Promise<{ error?: string }> {
  const buyer = await getCurrentBuyer();
  if (!buyer) return { error: "Connectez-vous." };
  const { data: order } = await supabase.from("market_orders").select("id, number, status").eq("id", orderId).eq("buyer_id", buyer.id).maybeSingle();
  if (!order) return { error: "Commande introuvable." };
  if (order.status !== "RECUE") return { error: "Le vendeur a déjà confirmé : contactez-le pour annuler." };
  await supabase.from("market_orders").update({ status: "ANNULEE", cancel_reason: "Annulée par le client", updated_at: new Date().toISOString() }).eq("id", order.id);
  await supabase.from("market_order_events").insert({ order_id: order.id, status: "ANNULEE" });
  revalidatePath(`/marche/commandes/${order.number}`);
  return {};
}

type MerchantOrderRow = {
  id: string;
  number: string;
  status: MarketOrderStatus;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  mobileMoneyOperator: "ORANGE" | "MOOV" | null;
  stockLocationId: string | null;
  saleId: string | null;
  shop: { locationId: string | null };
  items: { productId: string; name: string; unitPrice: number; quantity: number }[];
};

async function defaultLocationId(businessId: string): Promise<string | null> {
  const { data } = await supabase.from("locations").select("id").eq("business_id", businessId).order("is_default", { ascending: false }).limit(1).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Le vendeur fait avancer (ou annule) une commande. */
export async function updateMarketOrderStatusAction(orderId: string, status: MarketOrderStatus, reason?: string): Promise<{ error?: string; success?: string }> {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  if (!(await isMarketEnabledFor(user.businessId, user.business.activityKey))) return { error: "Marché non disponible." };

  const { data } = await supabase
    .from("market_orders")
    .select(
      "id, number, status, customerName:customer_name, customerPhone:customer_phone, paymentMethod:payment_method, mobileMoneyOperator:mobile_money_operator, " +
        "stockLocationId:stock_location_id, saleId:sale_id, shop:market_shops!inner(locationId:location_id), items:market_order_items(productId:product_id, name, unitPrice:unit_price, quantity)"
    )
    .eq("id", orderId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  const order = data as unknown as MerchantOrderRow | null;
  if (!order) return { error: "Commande introuvable." };
  if (order.status === "LIVREE" || order.status === "ANNULEE") return { error: "Cette commande est terminée." };

  const stepIndex = (s: string) => MARKET_ORDER_STEPS.findIndex((x) => x.key === s);
  if (status !== "ANNULEE" && stepIndex(status) <= stepIndex(order.status)) return { error: "Statut déjà dépassé." };

  const items = order.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) }));
  const movementBase = { businessId: user.businessId, userId: user.id, reason: "COMMANDE_MARCHE" };
  let stockLocationId = order.stockLocationId;
  let saleId = order.saleId;

  if (status === "ANNULEE") {
    // Le stock sorti à la confirmation revient.
    if (stockLocationId) {
      await recordStockMovements(items, { ...movementBase, locationId: stockLocationId, direction: "IN", note: `Annulation commande Marché ${order.number}` });
      stockLocationId = null;
    }
  } else {
    // Toute étape après « reçue » suppose le stock sorti.
    if (!stockLocationId) {
      const locationId = order.shop.locationId ?? (await defaultLocationId(user.businessId));
      if (!locationId) return { error: "Aucun point de vente pour sortir le stock." };
      const { data: stocks } = await supabase
        .from("product_stocks")
        .select("productId:product_id, quantity")
        .eq("location_id", locationId)
        .in("product_id", items.map((i) => i.productId));
      for (const item of order.items) {
        const have = Number((stocks ?? []).find((s) => s.productId === item.productId)?.quantity ?? 0);
        if (have < Number(item.quantity)) return { error: `Stock insuffisant pour ${item.name} (${have} disponible).` };
      }
      await recordStockMovements(items, { ...movementBase, locationId, direction: "OUT", note: `Commande Marché ${order.number}` });
      stockLocationId = locationId;
    }

    if (status === "LIVREE") {
      // Le stock déjà sorti est remis puis revendu par la vraie vente (caisse, ticket, rapports).
      await recordStockMovements(items, { ...movementBase, locationId: stockLocationId, direction: "IN", note: `Commande Marché ${order.number} → vente` });
      const customerId = await findOrCreateCustomer(user.businessId, order.customerName, order.customerPhone);
      const saleItems = order.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), discount: 0 }));
      const total = saleItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const sale = await createSaleAction({
        locationId: stockLocationId,
        items: saleItems,
        customerId: customerId ?? undefined,
        discount: 0,
        paymentMethod: order.paymentMethod === "MOBILE_MONEY" ? "MOBILE_MONEY" : "ESPECES",
        amountPaid: total,
        mobileMoneyOperator: order.paymentMethod === "MOBILE_MONEY" ? order.mobileMoneyOperator ?? undefined : undefined,
        note: `Marché ZINDO — commande ${order.number} (${order.customerName}, ${order.customerPhone})`,
        clientRef: `market-order:${order.id}`,
      });
      if (!sale.success) {
        // La vente a échoué : le stock ressort pour rester cohérent avec la commande.
        await recordStockMovements(items, { ...movementBase, locationId: stockLocationId, direction: "OUT", note: `Commande Marché ${order.number}` });
        await supabase.from("market_orders").update({ stock_location_id: stockLocationId }).eq("id", order.id);
        return { error: sale.error };
      }
      saleId = sale.saleId;
    }
  }

  const { error } = await supabase
    .from("market_orders")
    .update({
      status,
      stock_location_id: stockLocationId,
      sale_id: saleId,
      cancel_reason: status === "ANNULEE" ? reason?.trim() || "Annulée par le vendeur" : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  if (error) {
    console.error("[updateMarketOrderStatusAction]", error.message);
    return { error: "Mise à jour impossible, réessayez." };
  }
  await supabase.from("market_order_events").insert({ order_id: order.id, status });
  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "market_order",
    entityId: order.id,
    details: `Commande Marché ${order.number} : ${marketOrderStatusLabel(status)}`,
  });
  revalidatePath("/mon-marche/commandes");
  revalidatePath(`/mon-marche/commandes/${order.id}`);
  return { success: `Commande ${order.number} : ${marketOrderStatusLabel(status)}.` };
}

async function findOrCreateCustomer(businessId: string, name: string, phone: string): Promise<string | null> {
  const { data: existing } = await supabase.from("customers").select("id").eq("business_id", businessId).eq("phone", phone).limit(1).maybeSingle();
  if (existing) return existing.id as string;
  const { data: created, error } = await supabase.from("customers").insert({ business_id: businessId, name, phone }).select("id").single();
  if (error) console.error("[findOrCreateCustomer]", error.message);
  return (created?.id as string | undefined) ?? null;
}

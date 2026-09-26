"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { saveOnlineStoreCoverPhoto, deleteUploadedImage } from "@/lib/photo-upload";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { createSaleAction, type CartItemInput } from "@/lib/actions/sales";
import { rethrowIfNavigationSignal } from "@/lib/action-errors";
import type { OnlineOrderStatus } from "@/lib/db-types";

export type ActionState = { error?: string; success?: string } | undefined;

const slugSchema = z
  .string()
  .min(3, "3 caractères minimum")
  .max(40, "40 caractères maximum")
  .regex(/^[a-z0-9-]+$/, "Uniquement des minuscules, chiffres et tirets (ex : quincaillerie-some)");

const storeSchema = z.object({
  slug: slugSchema,
  storeName: z.string().min(1, "Le nom de la boutique est requis"),
  tagline: z.string().optional(),
  description: z.string().optional(),
  contactPhone: z.string().optional(),
  whatsappNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  footerMessage: z.string().optional(),
  locationId: z.string().optional(),
  deliveryEnabled: z.coerce.boolean(),
  deliveryFee: z.coerce.number().min(0).default(0),
  freeDeliveryAbove: z.coerce.number().min(0).optional(),
  deliveryNote: z.string().optional(),
  pickupEnabled: z.coerce.boolean(),
  payOnDeliveryEnabled: z.coerce.boolean(),
  mobileMoneyEnabled: z.coerce.boolean(),
  mobileMoneyNumber: z.string().optional(),
  minOrderAmount: z.coerce.number().min(0).default(0),
  showOutOfStock: z.coerce.boolean(),
  published: z.coerce.boolean(),
});

export async function saveOnlineStoreAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = storeSchema.safeParse({
    slug: (formData.get("slug") as string)?.trim().toLowerCase(),
    storeName: formData.get("storeName"),
    tagline: formData.get("tagline") || undefined,
    description: formData.get("description") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
    whatsappNumber: formData.get("whatsappNumber") || undefined,
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    footerMessage: formData.get("footerMessage") || undefined,
    locationId: formData.get("locationId") || undefined,
    deliveryEnabled: formData.get("deliveryEnabled") === "on",
    deliveryFee: formData.get("deliveryFee") || 0,
    freeDeliveryAbove: formData.get("freeDeliveryAbove") || undefined,
    deliveryNote: formData.get("deliveryNote") || undefined,
    pickupEnabled: formData.get("pickupEnabled") === "on",
    payOnDeliveryEnabled: formData.get("payOnDeliveryEnabled") === "on",
    mobileMoneyEnabled: formData.get("mobileMoneyEnabled") === "on",
    mobileMoneyNumber: formData.get("mobileMoneyNumber") || undefined,
    minOrderAmount: formData.get("minOrderAmount") || 0,
    showOutOfStock: formData.get("showOutOfStock") === "on",
    published: formData.get("published") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  if (parsed.data.published && !parsed.data.locationId) {
    return { error: "Choisissez la boutique/dépôt qui servira les commandes avant de publier" };
  }
  if (parsed.data.mobileMoneyEnabled && !parsed.data.mobileMoneyNumber?.trim()) {
    return { error: "Indiquez le numéro Mobile Money à afficher au client" };
  }

  const { data: slugTaken } = await supabase
    .from("online_stores")
    .select("id")
    .eq("slug", parsed.data.slug)
    .neq("business_id", user.businessId)
    .maybeSingle();
  if (slugTaken) return { error: "Cette adresse est déjà utilisée par un autre commerce, choisissez-en une autre" };

  if (parsed.data.locationId) {
    const { data: location } = await supabase
      .from("locations")
      .select("id")
      .eq("id", parsed.data.locationId)
      .eq("business_id", user.businessId)
      .maybeSingle();
    if (!location) return { error: "Boutique/dépôt introuvable" };
  }

  const { data: existing } = await supabase
    .from("online_stores")
    .select("coverPhotoUrl:cover_photo_url")
    .eq("business_id", user.businessId)
    .maybeSingle();

  let coverPhotoUrl: string | null | undefined;
  const coverPhotoFile = formData.get("coverPhoto");
  const removeCoverPhoto = formData.get("removeCoverPhoto") === "true";
  if (coverPhotoFile instanceof File && coverPhotoFile.size > 0) {
    const result = await saveOnlineStoreCoverPhoto(coverPhotoFile);
    if ("error" in result) return { error: result.error };
    coverPhotoUrl = result.url;
    await deleteUploadedImage(existing?.coverPhotoUrl as string | null | undefined);
  } else if (removeCoverPhoto) {
    coverPhotoUrl = null;
    await deleteUploadedImage(existing?.coverPhotoUrl as string | null | undefined);
  }

  const { error } = await supabase.from("online_stores").upsert(
    {
      business_id: user.businessId,
      slug: parsed.data.slug,
      store_name: parsed.data.storeName,
      tagline: parsed.data.tagline ?? null,
      description: parsed.data.description ?? null,
      contact_phone: parsed.data.contactPhone ?? null,
      whatsapp_number: parsed.data.whatsappNumber ?? null,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      footer_message: parsed.data.footerMessage ?? null,
      location_id: parsed.data.locationId ?? null,
      delivery_enabled: parsed.data.deliveryEnabled,
      delivery_fee: parsed.data.deliveryFee,
      free_delivery_above: parsed.data.freeDeliveryAbove ?? null,
      delivery_note: parsed.data.deliveryNote ?? null,
      pickup_enabled: parsed.data.pickupEnabled,
      pay_on_delivery_enabled: parsed.data.payOnDeliveryEnabled,
      mobile_money_enabled: parsed.data.mobileMoneyEnabled,
      mobile_money_number: parsed.data.mobileMoneyEnabled ? (parsed.data.mobileMoneyNumber ?? null) : null,
      min_order_amount: parsed.data.minOrderAmount,
      show_out_of_stock: parsed.data.showOutOfStock,
      published: parsed.data.published,
      ...(coverPhotoUrl !== undefined ? { cover_photo_url: coverPhotoUrl } : {}),
    },
    { onConflict: "business_id", ignoreDuplicates: false }
  );
  if (error) {
    console.error("[saveOnlineStoreAction] Échec de l'enregistrement :", error.message);
    return { error: "Impossible d'enregistrer la boutique en ligne" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "OnlineStore",
    details: parsed.data.published ? "Publiée" : "Enregistrée (non publiée)",
  });

  revalidatePath("/boutique-en-ligne");
  return { success: "Boutique en ligne enregistrée" };
}

export async function updateOnlineOrderStatusAction(
  orderId: string,
  status: OnlineOrderStatus,
  merchantNote?: string
) {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const { data: order } = await supabase
    .from("online_orders")
    .select("id, status, merchantNote:merchant_note, store:online_stores!inner(businessId:business_id)")
    .eq("id", orderId)
    .eq("online_stores.business_id", user.businessId)
    .maybeSingle();
  if (!order) return { error: "Commande introuvable" };

  if (await isOnlineOrderSaleEnabled(user.businessId)) {
    // « Encaissée » ne s'obtient que par encashOnlineOrderAction (vraie vente).
    if (status === "LIVREE" && order.status !== "LIVREE") return { error: "Utilisez « Encaisser » pour enregistrer la vente" };
    if (order.status === "LIVREE" && status !== "LIVREE") {
      const { data: sale } = await supabase
        .from("sales")
        .select("id")
        .eq("business_id", user.businessId)
        .eq("client_ref", `online-order:${orderId}`)
        .maybeSingle();
      if (sale) return { error: "Commande déjà encaissée : faites un retour sur la vente pour l'annuler" };
    }
  }

  const { error } = await supabase
    .from("online_orders")
    .update({ status, merchant_note: merchantNote ?? (order.merchantNote as string | null) })
    .eq("id", orderId);
  if (error) {
    console.error("[updateOnlineOrderStatusAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour la commande" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "OnlineOrder",
    entityId: orderId,
    details: status,
  });

  revalidatePath("/boutique-en-ligne/commandes");
  return { success: "Commande mise à jour" };
}

// ---------------------------------------------------------------------------
// Encaissement réel d'une commande en ligne : passer une commande à
// « Encaissée » ne changeait que son statut — ni stock, ni caisse, ni ticket.
// Derrière ce flag, l'encaissement crée une vraie vente (même chemin que la
// caisse et les tables : contrôles de stock, session de caisse, ticket).
// ---------------------------------------------------------------------------
const ONLINE_ORDER_SALE_FLAG = "commande_en_ligne_vente";

export async function isOnlineOrderSaleEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    ONLINE_ORDER_SALE_FLAG,
    "Commande en ligne encaissée = vraie vente",
    "Passer une commande de la boutique en ligne à « Encaissée » crée une vraie vente : le stock baisse, l'argent entre en caisse et un ticket est disponible."
  );
  return isFeatureEnabled(ONLINE_ORDER_SALE_FLAG, businessId);
}

const encashSchema = z.object({
  paymentMethod: z.enum(["ESPECES", "MOBILE_MONEY", "CARTE", "AUTRE"], { message: "Choisissez un moyen de paiement" }),
  mobileMoneyOperator: z.enum(["ORANGE", "MOOV", "WAVE"]).optional(),
});

type EncashOrderRow = {
  id: string;
  number: string;
  status: OnlineOrderStatus;
  customerName: string;
  customerPhone: string;
  discount: number | null;
  store: { businessId: string; locationId: string | null };
  items: { productId: string; quantity: number; unitPrice: number }[];
};

export async function encashOnlineOrderAction(
  orderId: string,
  formData: FormData
): Promise<{ error?: string; success?: string; saleId?: string }> {
  try {
    const user = await requirePermission(PERMISSIONS.SALES_CREATE);
    if (!(await isOnlineOrderSaleEnabled(user.businessId))) return { error: "Fonctionnalité non disponible pour le moment" };

    const parsed = encashSchema.safeParse({
      paymentMethod: formData.get("paymentMethod"),
      mobileMoneyOperator: formData.get("mobileMoneyOperator") || undefined,
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message };

    const { data } = await supabase
      .from("online_orders")
      .select(
        "id, number, status, customerName:customer_name, customerPhone:customer_phone, discount, " +
          "store:online_stores!inner(businessId:business_id, locationId:location_id), " +
          "items:online_order_items(productId:product_id, quantity, unitPrice:unit_price)"
      )
      .eq("id", orderId)
      .eq("online_stores.business_id", user.businessId)
      .maybeSingle();
    const order = data as unknown as EncashOrderRow | null;
    if (!order) return { error: "Commande introuvable" };
    if (order.status === "ANNULEE") return { error: "Cette commande est annulée : elle ne peut pas être encaissée" };
    if (order.items.length === 0) return { error: "Cette commande ne contient aucun article" };

    let locationId = order.store.locationId;
    if (!locationId) {
      const { data: location } = await supabase
        .from("locations")
        .select("id")
        .eq("business_id", user.businessId)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();
      locationId = (location?.id as string | undefined) ?? null;
    }
    if (!locationId) return { error: "Aucune boutique trouvée pour sortir le stock" };

    const items: CartItemInput[] = order.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      discount: 0,
    }));
    const discount = Math.max(0, Number(order.discount) || 0);
    const total = Math.max(0, items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0) - discount);

    // clientRef : une commande ne crée jamais plus d'une vente, même en cas de
    // double clic ou de nouvel encaissement après un changement de statut.
    const saleResult = await createSaleAction({
      locationId,
      items,
      discount,
      paymentMethod: parsed.data.paymentMethod,
      amountPaid: total,
      mobileMoneyOperator: parsed.data.paymentMethod === "MOBILE_MONEY" ? parsed.data.mobileMoneyOperator : undefined,
      note: `Boutique en ligne — commande ${order.number} (${order.customerName}, ${order.customerPhone})`,
      clientRef: `online-order:${order.id}`,
    });
    if (!saleResult.success) return { error: saleResult.error };

    const { error: statusError } = await supabase.from("online_orders").update({ status: "LIVREE" }).eq("id", order.id);
    if (statusError) console.error("[encashOnlineOrderAction] Échec de la mise à jour du statut :", statusError.message);

    await logAction({
      businessId: user.businessId,
      userId: user.id,
      action: "UPDATE",
      entity: "OnlineOrder",
      entityId: order.id,
      details: `Encaissée — vente ${saleResult.saleId}`,
    });

    revalidatePath("/boutique-en-ligne/commandes");
    return { success: "Commande encaissée", saleId: saleResult.saleId };
  } catch (e) {
    rethrowIfNavigationSignal(e);
    console.error("[encashOnlineOrderAction] Erreur inattendue :", e);
    return { error: "Une erreur inattendue est survenue" };
  }
}

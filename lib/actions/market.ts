"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { forget } from "@/lib/memo";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { isMarketEnabledFor } from "@/lib/market-data";
import { isMarketCategory, MAX_LISTING_PHOTOS, slugifyShopName } from "@/lib/market";
import { isCountryCode } from "@/lib/countries";
import { saveMarketShopImage, deleteUploadedImage, uploadedImageUrl } from "@/lib/photo-upload";

/**
 * Nouveau Marché ZINDO (flag nouveau_marche) : boutique du commerçant et
 * publication de ses produits du stock. Voir lib/market-data.ts.
 */

export type MarketActionState = { error?: string; success?: string } | undefined;

async function requireMarketUser(permission: Permission) {
  const user = await requirePermission(permission);
  if (!(await isMarketEnabledFor(user.businessId, user.business.activityKey))) redirect("/dashboard");
  return user;
}

const shopSchema = z.object({
  name: z.string().trim().min(2, "Nom de la boutique requis").max(80),
  slug: z.string().trim().max(40).optional(),
  description: z.string().trim().max(1000).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  city: z.string().trim().min(1, "Indiquez la ville de la boutique").max(80),
  countryCode: z.string().refine(isCountryCode, "Choisissez le pays de la boutique"),
  address: z.string().trim().max(200).optional(),
  hours: z.string().trim().max(200).optional(),
  locationId: z.string().trim().optional(),
  published: z.boolean(),
  deliveryEnabled: z.boolean(),
  deliveryFee: z.coerce.number().min(0, "Frais de livraison invalides").max(1_000_000),
  deliveryNote: z.string().trim().max(200).optional(),
  pickupEnabled: z.boolean(),
  payOnDelivery: z.boolean(),
  payOnPickup: z.boolean(),
  mobileMoneyEnabled: z.boolean(),
  orangeMoneyNumber: z.string().trim().max(30).optional(),
  moovMoneyNumber: z.string().trim().max(30).optional(),
});

function optional(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value : undefined;
}

export async function saveMarketShopAction(_prev: MarketActionState, formData: FormData): Promise<MarketActionState> {
  const user = await requireMarketUser(PERMISSIONS.SETTINGS_MANAGE);

  const parsed = shopSchema.safeParse({
    name: formData.get("name"),
    slug: optional(formData, "slug"),
    description: optional(formData, "description"),
    phone: optional(formData, "phone"),
    whatsapp: optional(formData, "whatsapp"),
    city: formData.get("city"),
    countryCode: formData.get("countryCode"),
    address: optional(formData, "address"),
    hours: optional(formData, "hours"),
    locationId: optional(formData, "locationId"),
    published: formData.get("published") === "on",
    deliveryEnabled: formData.get("deliveryEnabled") === "on",
    deliveryFee: String(formData.get("deliveryFee") ?? "").replace(/\s/g, "") || 0,
    deliveryNote: optional(formData, "deliveryNote"),
    pickupEnabled: formData.get("pickupEnabled") === "on",
    payOnDelivery: formData.get("payOnDelivery") === "on",
    payOnPickup: formData.get("payOnPickup") === "on",
    mobileMoneyEnabled: formData.get("mobileMoneyEnabled") === "on",
    orangeMoneyNumber: optional(formData, "orangeMoneyNumber"),
    moovMoneyNumber: optional(formData, "moovMoneyNumber"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const d = parsed.data;
  if (!d.deliveryEnabled && !d.pickupEnabled) return { error: "Proposez au moins la livraison ou le retrait en boutique." };
  if (d.mobileMoneyEnabled && !d.orangeMoneyNumber && !d.moovMoneyNumber) {
    return { error: "Indiquez votre numéro Orange Money ou Moov Money." };
  }
  if (!d.payOnDelivery && !d.payOnPickup && !d.mobileMoneyEnabled) return { error: "Choisissez au moins un moyen de paiement." };

  const slug = slugifyShopName(d.slug || d.name);
  if (slug.length < 3) return { error: "L'adresse de la boutique doit contenir au moins 3 lettres ou chiffres." };
  const { data: taken } = await supabase.from("market_shops").select("business_id").eq("slug", slug).maybeSingle();
  if (taken && taken.business_id !== user.businessId) return { error: "Cette adresse de boutique est déjà prise, choisissez-en une autre." };

  if (d.locationId) {
    const { data: location } = await supabase.from("locations").select("id").eq("id", d.locationId).eq("business_id", user.businessId).maybeSingle();
    if (!location) return { error: "Point de vente introuvable." };
  }

  const { data: existing } = await supabase
    .from("market_shops")
    .select("id, logoUrl:logo_url, coverUrl:cover_url")
    .eq("business_id", user.businessId)
    .maybeSingle();

  const images: { logo_url?: string; cover_url?: string } = {};
  for (const [field, column, previous] of [
    ["logo", "logo_url", existing?.logoUrl],
    ["cover", "cover_url", existing?.coverUrl],
  ] as const) {
    const direct = uploadedImageUrl(formData, field);
    if (direct) {
      images[column] = direct;
      await deleteUploadedImage(previous);
      continue;
    }
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) continue;
    const saved = await saveMarketShopImage(file);
    if ("error" in saved) return { error: saved.error };
    images[column] = saved.url;
    await deleteUploadedImage(previous);
  }

  const row = {
    business_id: user.businessId,
    slug,
    name: d.name,
    description: d.description ?? null,
    phone: d.phone ?? null,
    whatsapp: d.whatsapp ?? null,
    city: d.city,
    country_code: d.countryCode,
    address: d.address ?? null,
    hours: d.hours ?? null,
    location_id: d.locationId ?? null,
    published: d.published,
    delivery_enabled: d.deliveryEnabled,
    delivery_fee: d.deliveryFee,
    delivery_note: d.deliveryNote ?? null,
    pickup_enabled: d.pickupEnabled,
    pay_on_delivery: d.payOnDelivery,
    pay_on_pickup: d.payOnPickup,
    mobile_money_enabled: d.mobileMoneyEnabled,
    orange_money_number: d.orangeMoneyNumber ?? null,
    moov_money_number: d.moovMoneyNumber ?? null,
    updated_at: new Date().toISOString(),
    ...images,
  };
  const { error } = existing
    ? await supabase.from("market_shops").update(row).eq("id", existing.id)
    : await supabase.from("market_shops").insert(row);
  if (error) {
    console.error("[saveMarketShopAction]", error.message);
    return { error: "Enregistrement impossible, réessayez." };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: existing ? "UPDATE" : "CREATE",
    entity: "market_shop",
    details: `Boutique Marché « ${d.name} » (${d.published ? "publiée" : "masquée"})`,
  });
  revalidatePath("/mon-marche");
  revalidatePath("/marche", "layout");
  forget("marche:");
  return { success: "Boutique enregistrée." };
}

const listingSchema = z.object({
  productId: z.string().min(1),
  category: z.string().refine(isMarketCategory, "Choisissez une catégorie du Marché"),
  promoPrice: z.number().positive().nullable(),
  published: z.boolean(),
});

/** Publie (ou met à jour) un produit du stock sur le Marché : aucun produit n'est recréé. */
export async function saveMarketListingAction(input: {
  productId: string;
  category: string;
  promoPrice: number | null;
  published: boolean;
}): Promise<MarketActionState> {
  const user = await requireMarketUser(PERMISSIONS.PRODUCTS_MANAGE);
  const parsed = listingSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  const d = parsed.data;

  const { data: product } = await supabase
    .from("products")
    .select("id, name, salePrice:sale_price, photoUrl:photo_url")
    .eq("id", d.productId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!product) return { error: "Produit introuvable." };
  // Règle du propriétaire (28/09) : jamais de produit sans photo sur le Marché, pour aucun vendeur.
  if (d.published && !product.photoUrl?.trim()) {
    return { error: "Ajoutez d'abord une photo à ce produit : aucun produit sans photo n'est publié sur le Marché." };
  }
  if (d.promoPrice != null && d.promoPrice >= product.salePrice) {
    return { error: "Le prix promotionnel doit être inférieur au prix de vente." };
  }

  const { data: existing } = await supabase.from("market_listings").select("id, published").eq("product_id", d.productId).maybeSingle();
  const now = new Date().toISOString();
  const row = {
    business_id: user.businessId,
    product_id: d.productId,
    market_category: d.category,
    promo_price: d.promoPrice,
    published: d.published,
    updated_at: now,
    // Une (re)publication remonte le produit dans les nouveautés.
    ...(d.published && !existing?.published ? { published_at: now } : {}),
  };
  const { error } = existing
    ? await supabase.from("market_listings").update(row).eq("id", existing.id)
    : await supabase.from("market_listings").insert(row);
  if (error) {
    console.error("[saveMarketListingAction]", error.message);
    return { error: "Enregistrement impossible, réessayez." };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "market_listing",
    entityId: d.productId,
    details: `${product.name} : ${d.published ? "publié sur" : "retiré du"} Marché`,
  });
  revalidatePath("/mon-marche");
  revalidatePath(`/produits/${d.productId}`);
  revalidatePath("/marche", "layout");
  forget("marche:");
  return { success: d.published ? "Produit publié sur le Marché." : "Produit retiré du Marché." };
}

/** Ajoute une photo (déjà envoyée au stockage) à la galerie d'un produit publié. */
export async function addListingPhotoAction(listingId: string, url: string): Promise<{ error?: string; id?: string }> {
  const user = await requireMarketUser(PERMISSIONS.PRODUCTS_MANAGE);
  const form = new FormData();
  form.set("photoUploadedUrl", url);
  // Même contrôle que pour tout envoi direct : uniquement une image de notre propre stockage.
  if (!uploadedImageUrl(form, "photo")) return { error: "Image invalide." };
  const { data: listing } = await supabase.from("market_listings").select("id").eq("id", listingId).eq("business_id", user.businessId).maybeSingle();
  if (!listing) return { error: "Produit introuvable." };
  const { count } = await supabase.from("market_listing_photos").select("id", { count: "exact", head: true }).eq("listing_id", listingId);
  if ((count ?? 0) >= MAX_LISTING_PHOTOS) return { error: `${MAX_LISTING_PHOTOS} photos au maximum par produit.` };
  const { data, error } = await supabase.from("market_listing_photos").insert({ listing_id: listingId, url, position: count ?? 0 }).select("id").single();
  if (error || !data) return { error: "Enregistrement impossible, réessayez." };
  revalidatePath("/mon-marche/produits");
  return { id: data.id };
}

export async function removeListingPhotoAction(photoId: string): Promise<{ error?: string }> {
  const user = await requireMarketUser(PERMISSIONS.PRODUCTS_MANAGE);
  const { data: photo } = await supabase
    .from("market_listing_photos")
    .select("id, url, listing:market_listings!inner(business_id)")
    .eq("id", photoId)
    .eq("listing.business_id", user.businessId)
    .maybeSingle();
  if (!photo) return { error: "Photo introuvable." };
  await supabase.from("market_listing_photos").delete().eq("id", photoId);
  await deleteUploadedImage(photo.url as string);
  revalidatePath("/mon-marche/produits");
  return {};
}

const bulkSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1, "Sélectionnez au moins un produit").max(200),
  category: z.string().optional(),
  publish: z.boolean(),
});

/**
 * Publie (avec une catégorie du Marché) ou retire plusieurs produits d'un coup.
 * Les produits sans photo sont ignorés à la publication (règle du propriétaire).
 */
export async function bulkMarketListingAction(input: z.infer<typeof bulkSchema>): Promise<MarketActionState & { done?: number; skipped?: number }> {
  const user = await requireMarketUser(PERMISSIONS.PRODUCTS_MANAGE);
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Sélection invalide" };
  const d = parsed.data;
  if (d.publish && (!d.category || !isMarketCategory(d.category))) return { error: "Choisissez la catégorie du Marché pour ces produits." };

  const { data: products } = await supabase.from("products").select("id, photoUrl:photo_url").eq("business_id", user.businessId).in("id", d.productIds);
  const owned = (products ?? []) as { id: string; photoUrl: string | null }[];
  const now = new Date().toISOString();

  if (!d.publish) {
    const { error } = await supabase.from("market_listings").update({ published: false, updated_at: now }).eq("business_id", user.businessId).in("product_id", owned.map((p) => p.id));
    if (error) return { error: "Retrait impossible, réessayez." };
    await logAction({ businessId: user.businessId, userId: user.id, action: "UPDATE", entity: "market_listing", details: `${owned.length} produit(s) retiré(s) du Marché` });
    revalidatePath("/mon-marche/produits");
    revalidatePath("/marche", "layout");
  forget("marche:");
    return { success: `${owned.length} produit${owned.length > 1 ? "s" : ""} retiré${owned.length > 1 ? "s" : ""} du Marché.`, done: owned.length };
  }

  const withPhoto = owned.filter((p) => p.photoUrl?.trim());
  const { data: existing } = await supabase.from("market_listings").select("productId:product_id, published").in("product_id", withPhoto.map((p) => p.id));
  const wasPublished = new Set(((existing ?? []) as { productId: string; published: boolean }[]).filter((l) => l.published).map((l) => l.productId));
  const rows = withPhoto.map((p) => ({ business_id: user.businessId, product_id: p.id, market_category: d.category!, published: true, updated_at: now }));
  // Deux envois aux colonnes identiques : une (re)publication remonte le produit dans
  // les nouveautés (published_at), un produit déjà publié garde sa date.
  const fresh = rows.filter((r) => !wasPublished.has(r.product_id)).map((r) => ({ ...r, published_at: now }));
  const kept = rows.filter((r) => wasPublished.has(r.product_id));
  for (const batch of [fresh, kept]) {
    if (batch.length === 0) continue;
    const { error } = await supabase.from("market_listings").upsert(batch, { onConflict: "product_id" });
    if (error) {
      console.error("[bulkMarketListingAction]", error.message);
      return { error: "Publication impossible, réessayez." };
    }
  }
  const skipped = owned.length - withPhoto.length;
  await logAction({ businessId: user.businessId, userId: user.id, action: "UPDATE", entity: "market_listing", details: `${rows.length} produit(s) publié(s) sur le Marché` });
  revalidatePath("/mon-marche/produits");
  revalidatePath("/marche", "layout");
  forget("marche:");
  const withoutPhoto = skipped ? `${skipped} produit${skipped > 1 ? "s" : ""} sans photo (ajoutez une photo pour ${skipped > 1 ? "les" : "le"} publier)` : "";
  if (rows.length === 0) return { error: `Aucun produit publié : ${withoutPhoto}.`, done: 0, skipped };
  return {
    success: `${rows.length} produit${rows.length > 1 ? "s" : ""} publié${rows.length > 1 ? "s" : ""} sur le Marché.${skipped ? ` ${withoutPhoto.charAt(0).toUpperCase()}${withoutPhoto.slice(1)} : non publié${skipped > 1 ? "s" : ""}.` : ""}`,
    done: rows.length,
    skipped,
  };
}

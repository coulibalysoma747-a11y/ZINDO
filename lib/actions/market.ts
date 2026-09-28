"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { isMarketEnabledFor } from "@/lib/market-data";
import { isMarketCategory, slugifyShopName } from "@/lib/market";
import { saveMarketShopImage, deleteUploadedImage } from "@/lib/photo-upload";

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
  city: z.string().trim().max(80).optional(),
  address: z.string().trim().max(200).optional(),
  hours: z.string().trim().max(200).optional(),
  locationId: z.string().trim().optional(),
  published: z.boolean(),
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
    city: optional(formData, "city"),
    address: optional(formData, "address"),
    hours: optional(formData, "hours"),
    locationId: optional(formData, "locationId"),
    published: formData.get("published") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const d = parsed.data;

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
    city: d.city ?? null,
    address: d.address ?? null,
    hours: d.hours ?? null,
    location_id: d.locationId ?? null,
    published: d.published,
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
    .select("id, name, salePrice:sale_price")
    .eq("id", d.productId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!product) return { error: "Produit introuvable." };
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
  return { success: d.published ? "Produit publié sur le Marché." : "Produit retiré du Marché." };
}

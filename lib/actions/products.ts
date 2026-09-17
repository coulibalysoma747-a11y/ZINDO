"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generateProductReference, generateProductBarcode } from "@/lib/reference";
import { saveProductPhoto, deleteUploadedImage } from "@/lib/photo-upload";
import { getActivityConfig } from "@/lib/activity-config";
import { checkLimit } from "@/lib/subscription";
import { MOTO_ACTIVITY_KEY } from "@/lib/activities";
import { isPackagingUnitsModuleEnabled } from "@/lib/actions/packaging-units";

export type ActionState = { error?: string; success?: string } | undefined;

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().min(1).default("unité"),
  purchasePrice: z.coerce.number().min(0, "Doit être positif"),
  salePrice: z.coerce.number().min(0, "Doit être positif"),
  quantity: z.coerce.number().int().min(0).default(0),
  locationId: z.string().optional(),
  minStock: z.coerce.number().int().min(0).default(5),
  shelfLocation: z.string().optional(),
  supplierId: z.string().optional(),
  barcode: z.string().optional(),
  reference: z.string().optional(),
  trackUnits: z.coerce.boolean().default(false),
});

type PackagingRowInput = { name: string; multiplier: number; salePrice: number };

/**
 * Conditionnements saisis dans le formulaire "Nouveau produit" (voir
 * ProductForm) : lignes répétées sous les mêmes noms de champ
 * (packagingName/packagingMultiplier/packagingSalePrice), une ligne par
 * position. Une ligne sans nom est ignorée (case ajoutée puis laissée vide).
 */
function parsePackagingRows(formData: FormData): { rows: PackagingRowInput[] } | { error: string } {
  const names = formData.getAll("packagingName").map((v) => String(v).trim());
  const multipliers = formData.getAll("packagingMultiplier");
  const salePrices = formData.getAll("packagingSalePrice");

  const rows: PackagingRowInput[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (!name) continue;
    const multiplier = Number(multipliers[i]);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      return { error: `Conditionnement "${name}" : nombre d'unités par colis invalide` };
    }
    const salePrice = Number(salePrices[i]);
    if (!Number.isFinite(salePrice) || salePrice < 0) {
      return { error: `Conditionnement "${name}" : prix de vente invalide` };
    }
    rows.push({ name, multiplier, salePrice });
  }
  return { rows };
}

const MAX_ALIASES = 20;

/** Autres noms de recherche (voir ProductForm) — dédupliqués, plafonnés, jamais le nom principal lui-même. */
function parseAliases(formData: FormData, productName: string): string[] {
  const raw = formData.getAll("aliases").map((v) => String(v).trim());
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const alias of raw) {
    if (!alias || alias.toLowerCase() === productName.trim().toLowerCase()) continue;
    const key = alias.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    aliases.push(alias);
    if (aliases.length >= MAX_ALIASES) break;
  }
  return aliases;
}

async function replaceProductAliases(productId: string, aliases: string[]) {
  await supabase.from("product_aliases").delete().eq("product_id", productId);
  if (aliases.length === 0) return;
  const { error } = await supabase
    .from("product_aliases")
    .insert(aliases.map((alias) => ({ product_id: productId, alias })));
  if (error) console.error("[replaceProductAliases] Échec de l'enregistrement :", error.message);
}

function parseCustomFields(formData: FormData, defs: { key: string }[]): string | null {
  if (defs.length === 0) return null;
  const values: Record<string, string> = {};
  for (const def of defs) {
    const value = formData.get(`custom_${def.key}`);
    if (typeof value === "string" && value.trim() !== "") values[def.key] = value.trim();
  }
  return Object.keys(values).length > 0 ? JSON.stringify(values) : null;
}

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId") || undefined,
    brand: formData.get("brand") || undefined,
    description: formData.get("description") || undefined,
    unit: formData.get("unit") || "unité",
    purchasePrice: formData.get("purchasePrice"),
    salePrice: formData.get("salePrice"),
    quantity: formData.get("quantity") || 0,
    locationId: formData.get("locationId") || undefined,
    minStock: formData.get("minStock") || 5,
    shelfLocation: formData.get("shelfLocation") || undefined,
    supplierId: formData.get("supplierId") || undefined,
    barcode: formData.get("barcode") || undefined,
    reference: formData.get("reference") || undefined,
    trackUnits: formData.get("trackUnits") === "on" || formData.get("trackUnits") === "true",
  });
}

export async function createProductAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const parsed = parseProductForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const packagingRows = parsePackagingRows(formData);
  if ("error" in packagingRows) return { error: packagingRows.error };
  // Réservé à l'activité "Boutique de motos" — même restriction que
  // l'insertion de track_units plus bas.
  const effectiveTrackUnits = data.trackUnits && user.business.activityKey === MOTO_ACTIVITY_KEY;
  if (effectiveTrackUnits && packagingRows.rows.length > 0) {
    return { error: "Un produit à suivi individuel ne peut pas avoir de conditionnement" };
  }

  const limit = await checkLimit(user.businessId, "products");
  if (!limit.ok) {
    return {
      error: `Limite de votre abonnement atteinte (${limit.current}/${limit.limit} produits) — passez à un palier supérieur pour en ajouter davantage.`,
    };
  }

  if (data.quantity > 0 && !data.locationId) {
    return { error: "Sélectionnez la boutique qui reçoit le stock initial" };
  }

  if (data.barcode) {
    const { data: existingBarcode } = await supabase
      .from("products")
      .select("id")
      .eq("business_id", user.businessId)
      .eq("barcode", data.barcode)
      .maybeSingle();
    if (existingBarcode) return { error: "Ce code-barres est déjà utilisé par un autre produit" };
  }

  const reference = data.reference?.trim() || (await generateProductReference(user.businessId));

  const { data: existingRef } = await supabase
    .from("products")
    .select("id")
    .eq("business_id", user.businessId)
    .eq("reference", reference)
    .maybeSingle();
  if (existingRef) return { error: "Cette référence est déjà utilisée" };

  let photoUrl: string | undefined;
  const photoFile = formData.get("photo");
  if (photoFile instanceof File && photoFile.size > 0) {
    const result = await saveProductPhoto(photoFile);
    if ("error" in result) return { error: result.error };
    photoUrl = result.url;
  }

  const activityConfig = await getActivityConfig(user.business.activityKey);
  const customFields = parseCustomFields(formData, activityConfig.customFields);

  const { data: product, error: createError } = await supabase
    .from("products")
    .insert({
      business_id: user.businessId,
      reference,
      name: data.name,
      category_id: data.categoryId || null,
      brand: data.brand ?? null,
      description: data.description ?? null,
      unit: data.unit,
      purchase_price: data.purchasePrice,
      sale_price: data.salePrice,
      min_stock: data.minStock,
      shelf_location: data.shelfLocation ?? null,
      supplier_id: data.supplierId || null,
      barcode: data.barcode || null,
      photo_url: photoUrl ?? null,
      custom_fields: customFields,
      // Réservé à l'activité "Boutique de motos" (lib/activities.ts) — même si
      // le formulaire envoyait true par erreur/manipulation, on l'ignore pour
      // toute autre activité.
      track_units: effectiveTrackUnits,
    })
    .select("id")
    .single();

  if (createError || !product) {
    console.error("[createProductAction] Échec de la création :", createError?.message);
    return { error: "Impossible de créer le produit" };
  }

  if (data.quantity > 0 && data.locationId) {
    const { error: stockError } = await supabase
      .from("product_stocks")
      .insert({ product_id: product.id, location_id: data.locationId, quantity: data.quantity });
    if (stockError) {
      console.error("[createProductAction] Échec de la création du stock initial :", stockError.message);
    } else {
      const { error: movementError } = await supabase.from("stock_movements").insert({
        business_id: user.businessId,
        location_id: data.locationId,
        product_id: product.id,
        direction: "IN",
        reason: "CORRECTION",
        quantity: data.quantity,
        old_stock: 0,
        new_stock: data.quantity,
        user_id: user.id,
        note: "Stock initial à la création du produit",
      });
      if (movementError) {
        console.error("[createProductAction] Échec de l'écriture du mouvement de stock :", movementError.message);
      }
    }
  }

  if (packagingRows.rows.length > 0 && (await isPackagingUnitsModuleEnabled(user.businessId))) {
    const { error: packagingError } = await supabase.from("product_packaging_units").insert(
      packagingRows.rows.map((r) => ({
        business_id: user.businessId,
        product_id: product.id,
        name: r.name,
        multiplier: r.multiplier,
        sale_price: r.salePrice,
      }))
    );
    if (packagingError) {
      console.error("[createProductAction] Échec de la création des conditionnements :", packagingError.message);
    }
  }

  const aliases = parseAliases(formData, data.name);
  if (aliases.length > 0) await replaceProductAliases(product.id as string, aliases);

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Product",
    entityId: product.id as string,
  });

  revalidatePath("/produits");
  redirect(`/produits/${product.id}`);
}

export async function updateProductAction(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const parsed = parseProductForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const { data: product } = await supabase
    .from("products")
    .select("id, photoUrl:photo_url")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!product) return { error: "Produit introuvable" };

  if (data.barcode) {
    const { data: existingBarcode } = await supabase
      .from("products")
      .select("id")
      .eq("business_id", user.businessId)
      .eq("barcode", data.barcode)
      .neq("id", id)
      .maybeSingle();
    if (existingBarcode) return { error: "Ce code-barres est déjà utilisé par un autre produit" };
  }

  let photoUrl: string | null | undefined;
  const photoFile = formData.get("photo");
  const removePhoto = formData.get("removePhoto") === "true";
  if (photoFile instanceof File && photoFile.size > 0) {
    const result = await saveProductPhoto(photoFile);
    if ("error" in result) return { error: result.error };
    photoUrl = result.url;
    await deleteUploadedImage(product.photoUrl as string | null);
  } else if (removePhoto) {
    photoUrl = null;
    await deleteUploadedImage(product.photoUrl as string | null);
  }

  const activityConfig = await getActivityConfig(user.business.activityKey);
  const customFields = parseCustomFields(formData, activityConfig.customFields);

  const { error: updateError } = await supabase
    .from("products")
    .update({
      name: data.name,
      category_id: data.categoryId || null,
      brand: data.brand ?? null,
      description: data.description ?? null,
      unit: data.unit,
      purchase_price: data.purchasePrice,
      sale_price: data.salePrice,
      min_stock: data.minStock,
      shelf_location: data.shelfLocation ?? null,
      supplier_id: data.supplierId || null,
      barcode: data.barcode || null,
      custom_fields: customFields,
      // Réservé à l'activité "Boutique de motos" (lib/activities.ts) — même si
      // le formulaire envoyait true par erreur/manipulation, on l'ignore pour
      // toute autre activité.
      track_units: data.trackUnits && user.business.activityKey === MOTO_ACTIVITY_KEY,
      ...(photoUrl !== undefined ? { photo_url: photoUrl } : {}),
    })
    .eq("id", id);

  if (updateError) {
    console.error("[updateProductAction] Échec de la mise à jour :", updateError.message);
    return { error: "Impossible de mettre à jour le produit" };
  }

  await replaceProductAliases(id, parseAliases(formData, data.name));

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "Product",
    entityId: id,
  });

  revalidatePath("/produits");
  revalidatePath(`/produits/${id}`);
  redirect(`/produits/${id}`);
}

export async function toggleProductActiveAction(id: string, active: boolean) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!product) return { error: "Produit introuvable" };

  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) {
    console.error("[toggleProductActiveAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible de mettre à jour le produit" };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: active ? "REACTIVATE" : "ARCHIVE",
    entity: "Product",
    entityId: id,
  });

  revalidatePath("/produits");
  revalidatePath(`/produits/${id}`);
  return { success: active ? "Produit réactivé" : "Produit archivé" };
}

/**
 * Génère et enregistre un vrai code-barres EAN-13 pour un produit qui n'en a
 * pas encore (jamais sa référence/SKU — voir generateProductBarcode) —
 * appelé juste avant l'impression d'étiquettes (voir /produits/etiquettes et
 * /produits/[id]/etiquette). Idempotent : si le produit a déjà un
 * code-barres, il est simplement renvoyé tel quel plutôt que remplacé.
 */
export async function ensureProductBarcodeAction(productId: string): Promise<{ barcode: string } | { error: string }> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);

  const { data: product } = await supabase
    .from("products")
    .select("id, barcode")
    .eq("id", productId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!product) return { error: "Produit introuvable" };
  if (product.barcode) return { barcode: product.barcode as string };

  try {
    const barcode = await generateProductBarcode(user.businessId);
    const { error } = await supabase.from("products").update({ barcode }).eq("id", productId);
    if (error) {
      console.error("[ensureProductBarcodeAction] Échec de l'enregistrement :", error.message);
      return { error: "Impossible de générer le code-barres" };
    }

    revalidatePath(`/produits/${productId}`);
    revalidatePath("/produits");
    return { barcode };
  } catch (e) {
    // La colonne next_barcode_seq peut ne pas encore exister si la migration
    // n'a pas été exécutée — ne jamais casser l'impression pour autant.
    console.error("[ensureProductBarcodeAction] Échec de la génération :", e);
    return { error: "Impossible de générer le code-barres pour le moment" };
  }
}

/**
 * Génère et enregistre un code-barres EAN-13 pour TOUS les produits actifs
 * du commerce qui n'en ont pas encore — bouton "Enregistrer tous les codes
 * manquants" de /produits/etiquettes. Renvoie les paires {id, barcode}
 * générées pour que l'écran mette à jour sa liste sans recharger la page.
 */
export async function ensureAllProductBarcodesAction(): Promise<{ generated: { id: string; barcode: string }[] } | { error: string }> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);

  const { data: missing } = await supabase
    .from("products")
    .select("id")
    .eq("business_id", user.businessId)
    .eq("active", true)
    .is("barcode", null);
  if (!missing || missing.length === 0) return { generated: [] };

  try {
    const generated: { id: string; barcode: string }[] = [];
    for (const p of missing) {
      const barcode = await generateProductBarcode(user.businessId);
      const { error } = await supabase.from("products").update({ barcode }).eq("id", p.id as string);
      if (!error) generated.push({ id: p.id as string, barcode });
    }

    revalidatePath("/produits");
    revalidatePath("/produits/etiquettes");
    return { generated };
  } catch (e) {
    console.error("[ensureAllProductBarcodesAction] Échec de la génération :", e);
    return { error: "Impossible de générer les codes-barres pour le moment" };
  }
}

/**
 * Mise à jour de la seule photo d'un produit — pour /photos-produits, où
 * l'on ne veut pas repasser par la validation complète de updateProductAction
 * (nom, prix, unité...) juste pour changer une image.
 */
export async function updateProductPhotoAction(productId: string, formData: FormData): Promise<{ url?: string; error?: string }> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);

  const { data: product } = await supabase
    .from("products")
    .select("id, photoUrl:photo_url")
    .eq("id", productId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!product) return { error: "Produit introuvable" };

  const photoFile = formData.get("photo");
  if (!(photoFile instanceof File) || photoFile.size === 0) return { error: "Aucune image reçue" };

  const result = await saveProductPhoto(photoFile);
  if ("error" in result) return { error: result.error };

  const { error } = await supabase.from("products").update({ photo_url: result.url }).eq("id", productId);
  if (error) {
    console.error("[updateProductPhotoAction] Échec de la mise à jour :", error.message);
    return { error: "Impossible d'enregistrer la photo" };
  }
  await deleteUploadedImage(product.photoUrl as string | null);

  revalidatePath("/photos-produits");
  revalidatePath("/produits");
  return { url: result.url };
}

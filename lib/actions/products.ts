"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generateProductReference } from "@/lib/reference";
import { saveProductPhoto, deleteUploadedImage } from "@/lib/photo-upload";
import { getActivityConfig } from "@/lib/activity-config";
import { checkLimit } from "@/lib/subscription";

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
});

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
      ...(photoUrl !== undefined ? { photo_url: photoUrl } : {}),
    })
    .eq("id", id);

  if (updateError) {
    console.error("[updateProductAction] Échec de la mise à jour :", updateError.message);
    return { error: "Impossible de mettre à jour le produit" };
  }

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

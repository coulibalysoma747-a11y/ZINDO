"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
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
    const existingBarcode = await prisma.product.findFirst({
      where: { businessId: user.businessId, barcode: data.barcode },
    });
    if (existingBarcode) return { error: "Ce code-barres est déjà utilisé par un autre produit" };
  }

  const reference =
    data.reference?.trim() || (await generateProductReference(user.businessId));

  const existingRef = await prisma.product.findFirst({
    where: { businessId: user.businessId, reference },
  });
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

  const product = await prisma.product.create({
    data: {
      businessId: user.businessId,
      reference,
      name: data.name,
      categoryId: data.categoryId || null,
      brand: data.brand,
      description: data.description,
      unit: data.unit,
      purchasePrice: data.purchasePrice,
      salePrice: data.salePrice,
      minStock: data.minStock,
      shelfLocation: data.shelfLocation,
      supplierId: data.supplierId || null,
      barcode: data.barcode || null,
      photoUrl,
      customFields,
    },
  });

  if (data.quantity > 0 && data.locationId) {
    await prisma.$transaction([
      prisma.productStock.create({
        data: { productId: product.id, locationId: data.locationId, quantity: data.quantity },
      }),
      prisma.stockMovement.create({
        data: {
          businessId: user.businessId,
          locationId: data.locationId,
          productId: product.id,
          direction: "IN",
          reason: "CORRECTION",
          quantity: data.quantity,
          oldStock: 0,
          newStock: data.quantity,
          userId: user.id,
          note: "Stock initial à la création du produit",
        },
      }),
    ]);
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Product",
    entityId: product.id,
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

  const product = await prisma.product.findFirst({
    where: { id, businessId: user.businessId },
  });
  if (!product) return { error: "Produit introuvable" };

  if (data.barcode) {
    const existingBarcode = await prisma.product.findFirst({
      where: { businessId: user.businessId, barcode: data.barcode, NOT: { id } },
    });
    if (existingBarcode) return { error: "Ce code-barres est déjà utilisé par un autre produit" };
  }

  let photoUrl: string | null | undefined;
  const photoFile = formData.get("photo");
  const removePhoto = formData.get("removePhoto") === "true";
  if (photoFile instanceof File && photoFile.size > 0) {
    const result = await saveProductPhoto(photoFile);
    if ("error" in result) return { error: result.error };
    photoUrl = result.url;
    await deleteUploadedImage(product.photoUrl);
  } else if (removePhoto) {
    photoUrl = null;
    await deleteUploadedImage(product.photoUrl);
  }

  const activityConfig = await getActivityConfig(user.business.activityKey);
  const customFields = parseCustomFields(formData, activityConfig.customFields);

  await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      categoryId: data.categoryId || null,
      brand: data.brand,
      description: data.description,
      unit: data.unit,
      purchasePrice: data.purchasePrice,
      salePrice: data.salePrice,
      minStock: data.minStock,
      shelfLocation: data.shelfLocation,
      supplierId: data.supplierId || null,
      barcode: data.barcode || null,
      customFields,
      ...(photoUrl !== undefined ? { photoUrl } : {}),
    },
  });

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
  const product = await prisma.product.findFirst({
    where: { id, businessId: user.businessId },
  });
  if (!product) return { error: "Produit introuvable" };

  await prisma.product.update({ where: { id }, data: { active } });
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

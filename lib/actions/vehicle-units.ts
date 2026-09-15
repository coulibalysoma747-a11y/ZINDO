"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission, requireUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { adjustStock } from "@/lib/stock";
import { MOTO_ACTIVITY_KEY } from "@/lib/activities";

export type VehicleUnit = {
  id: string;
  chassisNumber: string;
  engineNumber: string | null;
  color: string | null;
  cmcAvailable: boolean;
  status: "EN_STOCK" | "VENDU";
  locationId: string;
  locationName: string;
  saleId: string | null;
  createdAt: string;
};

export async function getVehicleUnitsAction(productId: string): Promise<VehicleUnit[]> {
  const user = await requireUser();
  const { data } = await supabase
    .from("vehicle_units")
    .select(
      "id, chassisNumber:chassis_number, engineNumber:engine_number, color, cmcAvailable:cmc_available, status, locationId:location_id, saleId:sale_id, createdAt:created_at, location:locations(name)"
    )
    .eq("business_id", user.businessId)
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as unknown as Array<VehicleUnit & { location: { name: string } | null }>).map((u) => ({
    ...u,
    locationName: u.location?.name ?? "—",
  }));
}

const unitSchema = z.object({
  chassisNumber: z.string().min(1, "Le numéro de châssis est requis"),
  engineNumber: z.string().optional(),
  color: z.string().optional(),
  cmcAvailable: z.coerce.boolean().default(false),
  locationId: z.string().min(1, "Choisissez une boutique"),
});

export type VehicleUnitActionResult = { error?: string; success?: string };

/** Enregistre un nouvel exemplaire (moto/engin) et augmente le stock du produit d'une unité. */
export async function addVehicleUnitAction(productId: string, formData: FormData): Promise<VehicleUnitActionResult> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  if (user.business.activityKey !== MOTO_ACTIVITY_KEY) {
    return { error: "Le suivi individuel des exemplaires est réservé à l'activité Boutique de motos" };
  }

  const parsed = unitSchema.safeParse({
    chassisNumber: formData.get("chassisNumber"),
    engineNumber: formData.get("engineNumber") || undefined,
    color: formData.get("color") || undefined,
    cmcAvailable: formData.get("cmcAvailable") === "on" || formData.get("cmcAvailable") === "true",
    locationId: formData.get("locationId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!product) return { error: "Produit introuvable" };

  const { data: existingChassis } = await supabase
    .from("vehicle_units")
    .select("id")
    .eq("business_id", user.businessId)
    .eq("chassis_number", data.chassisNumber)
    .maybeSingle();
  if (existingChassis) return { error: "Ce numéro de châssis est déjà enregistré" };

  const { data: unit, error: insertError } = await supabase
    .from("vehicle_units")
    .insert({
      business_id: user.businessId,
      product_id: productId,
      location_id: data.locationId,
      chassis_number: data.chassisNumber,
      engine_number: data.engineNumber ?? null,
      color: data.color ?? null,
      cmc_available: data.cmcAvailable,
      status: "EN_STOCK",
    })
    .select("id")
    .single();
  if (insertError || !unit) {
    console.error("[addVehicleUnitAction] Échec de l'enregistrement :", insertError?.message);
    return { error: "Impossible d'enregistrer cet exemplaire" };
  }

  try {
    const { oldStock, newStock } = await adjustStock({ productId, locationId: data.locationId, delta: 1 });
    await supabase.from("stock_movements").insert({
      business_id: user.businessId,
      location_id: data.locationId,
      product_id: productId,
      direction: "IN",
      reason: "ACHAT",
      quantity: 1,
      old_stock: oldStock,
      new_stock: newStock,
      user_id: user.id,
      note: `Enregistrement châssis ${data.chassisNumber}`,
    });
  } catch (e) {
    console.error("[addVehicleUnitAction] Échec de l'ajustement du stock :", e);
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "CREATE", entity: "VehicleUnit", entityId: unit.id as string });
  revalidatePath(`/produits/${productId}`);
  revalidatePath("/produits");
  return { success: "Exemplaire enregistré" };
}

const updateUnitSchema = z.object({
  chassisNumber: z.string().min(1, "Le numéro de châssis est requis"),
  engineNumber: z.string().optional(),
  color: z.string().optional(),
  cmcAvailable: z.coerce.boolean().default(false),
});

export async function updateVehicleUnitAction(unitId: string, formData: FormData): Promise<VehicleUnitActionResult> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  if (user.business.activityKey !== MOTO_ACTIVITY_KEY) {
    return { error: "Le suivi individuel des exemplaires est réservé à l'activité Boutique de motos" };
  }

  const parsed = updateUnitSchema.safeParse({
    chassisNumber: formData.get("chassisNumber"),
    engineNumber: formData.get("engineNumber") || undefined,
    color: formData.get("color") || undefined,
    cmcAvailable: formData.get("cmcAvailable") === "on" || formData.get("cmcAvailable") === "true",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const data = parsed.data;

  const { data: existingChassis } = await supabase
    .from("vehicle_units")
    .select("id")
    .eq("business_id", user.businessId)
    .eq("chassis_number", data.chassisNumber)
    .neq("id", unitId)
    .maybeSingle();
  if (existingChassis) return { error: "Ce numéro de châssis est déjà enregistré" };

  const { data: unit, error } = await supabase
    .from("vehicle_units")
    .update({
      chassis_number: data.chassisNumber,
      engine_number: data.engineNumber ?? null,
      color: data.color ?? null,
      cmc_available: data.cmcAvailable,
      updated_at: new Date().toISOString(),
    })
    .eq("id", unitId)
    .eq("business_id", user.businessId)
    .select("product_id")
    .single();
  if (error || !unit) {
    console.error("[updateVehicleUnitAction] Échec de la mise à jour :", error?.message);
    return { error: "Impossible de mettre à jour cet exemplaire" };
  }

  revalidatePath(`/produits/${unit.product_id}`);
  return { success: "Exemplaire mis à jour" };
}

/** Retire un exemplaire non vendu (erreur de saisie, doublon...) et diminue le stock d'une unité. */
export async function deleteVehicleUnitAction(unitId: string): Promise<VehicleUnitActionResult> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  if (user.business.activityKey !== MOTO_ACTIVITY_KEY) {
    return { error: "Le suivi individuel des exemplaires est réservé à l'activité Boutique de motos" };
  }

  const { data: unit } = await supabase
    .from("vehicle_units")
    .select("id, productId:product_id, locationId:location_id, status, chassisNumber:chassis_number")
    .eq("id", unitId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!unit) return { error: "Exemplaire introuvable" };
  if (unit.status === "VENDU") return { error: "Impossible de retirer un exemplaire déjà vendu" };

  const { error: deleteError } = await supabase.from("vehicle_units").delete().eq("id", unitId);
  if (deleteError) {
    console.error("[deleteVehicleUnitAction] Échec de la suppression :", deleteError.message);
    return { error: "Impossible de retirer cet exemplaire" };
  }

  try {
    const { oldStock, newStock } = await adjustStock({
      productId: unit.productId as string,
      locationId: unit.locationId as string,
      delta: -1,
    });
    await supabase.from("stock_movements").insert({
      business_id: user.businessId,
      location_id: unit.locationId,
      product_id: unit.productId,
      direction: "OUT",
      reason: "CORRECTION",
      quantity: 1,
      old_stock: oldStock,
      new_stock: newStock,
      user_id: user.id,
      note: `Retrait châssis ${unit.chassisNumber}`,
    });
  } catch (e) {
    console.error("[deleteVehicleUnitAction] Échec de l'ajustement du stock :", e);
  }

  revalidatePath(`/produits/${unit.productId}`);
  revalidatePath("/produits");
  return { success: "Exemplaire retiré" };
}

/** Exemplaires disponibles d'un produit à suivi unitaire, pour le sélecteur de la caisse. */
export async function getAvailableVehicleUnitsAction(
  productId: string,
  locationId: string
): Promise<{ id: string; chassisNumber: string; color: string | null }[]> {
  const user = await requireUser();
  const { data } = await supabase
    .from("vehicle_units")
    .select("id, chassisNumber:chassis_number, color")
    .eq("business_id", user.businessId)
    .eq("product_id", productId)
    .eq("location_id", locationId)
    .eq("status", "EN_STOCK")
    .order("chassis_number", { ascending: true });
  return (data ?? []) as unknown as { id: string; chassisNumber: string; color: string | null }[];
}

export type VehicleModel = {
  id: string;
  name: string;
  reference: string;
  photoUrl: string | null;
  salePrice: number;
  unit: string;
  availableCount: number;
};

/** Modèles de moto (produits à suivi unitaire) avec leur nombre d'exemplaires disponibles dans une boutique — pour le module Vente Engin. */
export async function getVehicleModelsAction(locationId: string): Promise<VehicleModel[]> {
  const user = await requireUser();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, reference, photoUrl:photo_url, salePrice:sale_price, unit")
    .eq("business_id", user.businessId)
    .eq("track_units", true)
    .eq("active", true)
    .order("name", { ascending: true });
  if (!products || products.length === 0) return [];

  const { data: units } = await supabase
    .from("vehicle_units")
    .select("productId:product_id")
    .eq("business_id", user.businessId)
    .eq("location_id", locationId)
    .eq("status", "EN_STOCK")
    .in(
      "product_id",
      products.map((p) => p.id as string)
    );
  const countByProduct = new Map<string, number>();
  for (const u of (units ?? []) as unknown as Array<{ productId: string }>) {
    countByProduct.set(u.productId, (countByProduct.get(u.productId) ?? 0) + 1);
  }

  return (products as unknown as Array<Omit<VehicleModel, "availableCount">>).map((p) => ({
    ...p,
    availableCount: countByProduct.get(p.id) ?? 0,
  }));
}

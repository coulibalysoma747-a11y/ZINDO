"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { listFasoStockStores, FasoStockError, type FasoStockStore } from "@/lib/integrations/faso-stock";
import { runFasoStockSync, type FasoStockStoreMapping } from "@/lib/faso-stock-sync";

export type FasoStockActionResult = { success: true; stores: FasoStockStore[] } | { success: false; error: string };

/** Enregistre (ou remplace) la clé API FasoStock du commerce, après l'avoir vérifiée. */
export async function connectFasoStockAction(formData: FormData): Promise<FasoStockActionResult> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) return { success: false, error: "Collez votre clé API FasoStock." };

  let stores: FasoStockStore[];
  try {
    stores = await listFasoStockStores(apiKey);
  } catch (e) {
    const message = e instanceof FasoStockError ? e.message : "Impossible de contacter FasoStock. Vérifiez la clé.";
    return { success: false, error: message };
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      faso_stock_api_key: apiKey,
      faso_stock_store_mapping: null,
      faso_stock_last_sync_status: null,
      faso_stock_last_sync_error: null,
    })
    .eq("id", user.businessId);
  if (error) {
    console.error("[connectFasoStockAction] Échec de l'enregistrement :", error.message);
    return { success: false, error: "Impossible d'enregistrer la clé." };
  }

  await logAction({ businessId: user.businessId, userId: user.id, action: "UPDATE", entity: "Business", details: "Connexion FasoStock" });
  revalidatePath("/parametres");
  return { success: true, stores };
}

/** Recharge la liste des boutiques FasoStock avec la clé déjà enregistrée (ex. après rechargement de page). */
export async function reloadFasoStockStoresAction(): Promise<FasoStockActionResult> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const { data: business } = await supabase
    .from("businesses")
    .select("fasoStockApiKey:faso_stock_api_key")
    .eq("id", user.businessId)
    .maybeSingle();
  const apiKey = business?.fasoStockApiKey as string | null;
  if (!apiKey) return { success: false, error: "Aucune clé FasoStock enregistrée." };

  try {
    const stores = await listFasoStockStores(apiKey);
    return { success: true, stores };
  } catch (e) {
    const message = e instanceof FasoStockError ? e.message : "Impossible de contacter FasoStock.";
    return { success: false, error: message };
  }
}

export async function disconnectFasoStockAction() {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const { error } = await supabase
    .from("businesses")
    .update({
      faso_stock_api_key: null,
      faso_stock_store_mapping: null,
      faso_stock_last_sync_at: null,
      faso_stock_last_sync_status: null,
      faso_stock_last_sync_error: null,
    })
    .eq("id", user.businessId);
  if (error) return { error: "Impossible de déconnecter FasoStock." };

  await logAction({ businessId: user.businessId, userId: user.id, action: "UPDATE", entity: "Business", details: "Déconnexion FasoStock" });
  revalidatePath("/parametres");
  return { success: "FasoStock déconnecté." };
}

export async function saveFasoStockMappingAction(mapping: FasoStockStoreMapping) {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const { error } = await supabase
    .from("businesses")
    .update({ faso_stock_store_mapping: JSON.stringify(mapping) })
    .eq("id", user.businessId);
  if (error) return { error: "Impossible d'enregistrer l'association des boutiques." };
  revalidatePath("/parametres");
  return { success: "Association enregistrée." };
}

export type RunFasoStockSyncResult = { success: true; message: string } | { success: false; error: string };

export async function runFasoStockSyncAction(): Promise<RunFasoStockSyncResult> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const { data: business } = await supabase
    .from("businesses")
    .select("fasoStockApiKey:faso_stock_api_key, fasoStockStoreMapping:faso_stock_store_mapping")
    .eq("id", user.businessId)
    .maybeSingle();

  const apiKey = business?.fasoStockApiKey as string | null;
  if (!apiKey) return { success: false, error: "Connectez d'abord votre clé API FasoStock." };

  let mapping: FasoStockStoreMapping = {};
  try {
    mapping = business?.fasoStockStoreMapping ? JSON.parse(business.fasoStockStoreMapping as string) : {};
  } catch {
    mapping = {};
  }

  const result = await runFasoStockSync(user.businessId, apiKey, mapping);

  await supabase
    .from("businesses")
    .update({
      faso_stock_last_sync_at: new Date().toISOString(),
      faso_stock_last_sync_status: result.success ? "OK" : "ERREUR",
      faso_stock_last_sync_error: result.success ? null : result.error,
    })
    .eq("id", user.businessId);

  if (!result.success) return { success: false, error: result.error };

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "UPDATE",
    entity: "Product",
    details: `Synchronisation FasoStock : ${result.productsCreated} créé(s), ${result.productsUpdated} mis à jour`,
  });

  revalidatePath("/parametres");
  revalidatePath("/produits");
  return {
    success: true,
    message: `${result.storesSynced} boutique(s) synchronisée(s) — ${result.productsCreated} produit(s) créé(s), ${result.productsUpdated} mis à jour.`,
  };
}

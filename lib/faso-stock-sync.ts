import "server-only";
import { supabase } from "@/lib/supabase";
import { fetchAllFasoStockProducts, type FasoStockProduct } from "@/lib/integrations/faso-stock";

export type FasoStockStoreMapping = Record<string, string>; // id boutique FasoStock -> id boutique ZINDO

export type FasoStockSyncResult =
  | { success: true; storesSynced: number; productsCreated: number; productsUpdated: number }
  | { success: false; error: string };

const DB_CHUNK_SIZE = 300;

/**
 * Synchronise le catalogue FasoStock vers ZINDO (sens unique — l'API
 * FasoStock est en lecture seule). Pour chaque boutique associée : récupère
 * tous les produits, puis les écrit par lots (catégories manquantes créées
 * à la volée, produits et stock upsertés en associant sur faso_stock_id).
 * N'écrase jamais purchase_price ni min_stock (non fournis par FasoStock —
 * ce que le commerçant a réglé manuellement dans ZINDO est préservé). Ne
 * désactive pas les produits disparus côté FasoStock (hors périmètre v1).
 */
export async function runFasoStockSync(
  businessId: string,
  apiKey: string,
  mapping: FasoStockStoreMapping
): Promise<FasoStockSyncResult> {
  const entries = Object.entries(mapping).filter(([, locationId]) => !!locationId);
  if (entries.length === 0) {
    return { success: false, error: "Aucune boutique associée pour le moment." };
  }

  let created = 0;
  let updated = 0;

  try {
    for (const [fasoStoreId, locationId] of entries) {
      const products = await fetchAllFasoStockProducts(apiKey, fasoStoreId);
      const stats = await syncProductsIntoLocation(businessId, locationId, products);
      created += stats.created;
      updated += stats.updated;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue lors de la synchronisation.";
    return { success: false, error: message };
  }

  return { success: true, storesSynced: entries.length, productsCreated: created, productsUpdated: updated };
}

async function syncProductsIntoLocation(businessId: string, locationId: string, products: FasoStockProduct[]) {
  let created = 0;
  let updated = 0;

  for (let i = 0; i < products.length; i += DB_CHUNK_SIZE) {
    const chunk = products.slice(i, i + DB_CHUNK_SIZE);
    const categoryIdByName = await resolveCategories(businessId, chunk);

    const { data: existing } = await supabase
      .from("products")
      .select("faso_stock_id")
      .eq("business_id", businessId)
      .in(
        "faso_stock_id",
        chunk.map((p) => p.id)
      );
    const existingIds = new Set((existing ?? []).map((r) => r.faso_stock_id as string));

    const rows = chunk.map((p) => ({
      business_id: businessId,
      faso_stock_id: p.id,
      reference: p.sku?.trim() || `FS-${p.id.slice(0, 8)}`,
      name: p.name,
      category_id: p.category ? (categoryIdByName.get(p.category.name) ?? null) : null,
      brand: p.brand?.name ?? null,
      unit: p.unit || "unité",
      sale_price: p.price,
      barcode: p.barcode || null,
      photo_url: p.images?.[0] ?? null,
      description: p.description ?? null,
      active: true,
    }));

    const { data: upserted, error } = await supabase
      .from("products")
      .upsert(rows, { onConflict: "business_id,faso_stock_id" })
      .select("id, faso_stock_id");
    if (error) throw new Error(`Échec de l'enregistrement des produits : ${error.message}`);

    for (const p of chunk) {
      if (existingIds.has(p.id)) updated++;
      else created++;
    }

    const productIdByFasoId = new Map(
      ((upserted ?? []) as { id: string; faso_stock_id: string }[]).map((r) => [r.faso_stock_id, r.id])
    );
    const stockRows = chunk
      .map((p) => {
        const productId = productIdByFasoId.get(p.id);
        return productId ? { product_id: productId, location_id: locationId, quantity: Math.max(0, Math.round(p.stock)) } : null;
      })
      .filter((r): r is { product_id: string; location_id: string; quantity: number } => r !== null);

    if (stockRows.length > 0) {
      const { error: stockError } = await supabase
        .from("product_stocks")
        .upsert(stockRows, { onConflict: "product_id,location_id" });
      if (stockError) throw new Error(`Échec de la mise à jour du stock : ${stockError.message}`);
    }
  }

  return { created, updated };
}

async function resolveCategories(businessId: string, products: FasoStockProduct[]): Promise<Map<string, string>> {
  const names = [...new Set(products.map((p) => p.category?.name).filter((n): n is string => !!n))];
  if (names.length === 0) return new Map();

  const { data: existing } = await supabase.from("categories").select("id, name").eq("business_id", businessId).in("name", names);
  const map = new Map((existing ?? []).map((c) => [c.name as string, c.id as string]));

  const missing = names.filter((n) => !map.has(n));
  if (missing.length > 0) {
    const { data: createdRows } = await supabase
      .from("categories")
      .insert(missing.map((name) => ({ business_id: businessId, name })))
      .select("id, name");
    for (const c of createdRows ?? []) map.set(c.name as string, c.id as string);
  }
  return map;
}

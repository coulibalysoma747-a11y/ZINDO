"use server";

import { supabase } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { isPackagingUnitsModuleEnabled } from "@/lib/actions/packaging-units";

const PRODUCT_FIELDS =
  "id, businessId:business_id, reference, name, categoryId:category_id, brand, description, unit, purchasePrice:purchase_price, salePrice:sale_price, minStock:min_stock, shelfLocation:shelf_location, supplierId:supplier_id, photoUrl:photo_url, barcode, customFields:custom_fields, active, createdAt:created_at, updatedAt:updated_at, trackUnits:track_units";

type ProductRow = {
  id: string;
  businessId: string;
  reference: string;
  name: string;
  categoryId: string | null;
  brand: string | null;
  description: string | null;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  minStock: number;
  shelfLocation: string | null;
  supplierId: string | null;
  photoUrl: string | null;
  barcode: string | null;
  customFields: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  trackUnits: boolean;
};

export type PackagingUnitOption = { id: string; productId: string; name: string; multiplier: number; salePrice: number; barcode: string | null };

/** Conditionnements de vente (voir lib/actions/packaging-units.ts) pour un lot de produits, regroupés par produit. */
async function fetchPackagingUnitsByProduct(businessId: string, productIds: string[]): Promise<Map<string, PackagingUnitOption[]>> {
  const map = new Map<string, PackagingUnitOption[]>();
  if (productIds.length === 0) return map;
  if (!(await isPackagingUnitsModuleEnabled(businessId))) return map;
  const { data } = await supabase
    .from("product_packaging_units")
    .select("id, productId:product_id, name, multiplier, salePrice:sale_price, barcode")
    .eq("business_id", businessId)
    .in("product_id", productIds);
  for (const row of (data ?? []) as unknown as PackagingUnitOption[]) {
    const list = map.get(row.productId) ?? [];
    list.push(row);
    map.set(row.productId, list);
  }
  return map;
}

export async function searchProductsAction(query: string, locationId: string) {
  const user = await requireUser();

  let q = supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("business_id", user.businessId)
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(15);

  const trimmed = query.trim();
  if (trimmed.length > 0) {
    const escaped = trimmed.replace(/[%_\\]/g, (m) => `\\${m}`);
    q = q.or(`name.ilike.%${escaped}%,reference.ilike.%${escaped}%,barcode.ilike.%${escaped}%`);
  }

  const { data } = await q;
  const products = (data ?? []) as unknown as ProductRow[];
  const ids = products.map((p) => p.id);
  const [{ data: stocks }, packagingByProduct] = await Promise.all([
    ids.length
      ? supabase.from("product_stocks").select("productId:product_id, quantity").in("product_id", ids).eq("location_id", locationId)
      : Promise.resolve({ data: [] as { productId: string; quantity: number }[] }),
    fetchPackagingUnitsByProduct(user.businessId, ids),
  ]);

  const stockMap = new Map((stocks ?? []).map((s) => [s.productId as string, s.quantity as number]));
  return products.map((p) => ({ ...p, quantity: stockMap.get(p.id) ?? 0, packagingUnits: packagingByProduct.get(p.id) ?? [] }));
}

/**
 * Tous les produits disponibles en stock dans la boutique active — utilisé pour
 * afficher automatiquement la grille de la caisse (Vente / Caisse) à l'ouverture,
 * sans attendre une recherche.
 */
export async function getPosProductsAction(locationId: string) {
  const user = await requireUser();

  const { data: stocks } = await supabase
    .from("product_stocks")
    .select(`quantity, product:products!inner(${PRODUCT_FIELDS})`)
    .eq("location_id", locationId)
    .gt("quantity", 0)
    .eq("products.business_id", user.businessId)
    .eq("products.active", true)
    .limit(300);

  const rows = (stocks ?? []) as unknown as Array<{ quantity: number; product: ProductRow }>;
  const packagingByProduct = await fetchPackagingUnitsByProduct(
    user.businessId,
    rows.map((r) => r.product.id)
  );
  return rows
    .map((s) => ({ ...s.product, quantity: s.quantity, packagingUnits: packagingByProduct.get(s.product.id) ?? [] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function findProductByExactCodeAction(code: string, locationId: string) {
  const user = await requireUser();
  // Deux requêtes indépendantes plutôt qu'un .or() : évite d'avoir à échapper
  // `code` pour la syntaxe filtre PostgREST (virgules/parenthèses y ont un
  // sens spécial), et évite de réutiliser un même query builder (mutable) pour
  // deux filtres différents.
  const { data: byBarcode } = await supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("business_id", user.businessId)
    .eq("active", true)
    .eq("barcode", code)
    .maybeSingle();
  let product =
    byBarcode ??
    (
      await supabase
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("business_id", user.businessId)
        .eq("active", true)
        .eq("reference", code)
        .maybeSingle()
    ).data;

  // Ni le code-barres ni la référence d'un produit ne correspondent : le code
  // scanné est peut-être celui d'un conditionnement (ex. l'étiquette d'un
  // "Carton de 12") plutôt que du produit lui-même.
  let matchedPackaging: PackagingUnitOption | null = null;
  if (!product && (await isPackagingUnitsModuleEnabled(user.businessId))) {
    const { data: packaging } = await supabase
      .from("product_packaging_units")
      .select("id, productId:product_id, name, multiplier, salePrice:sale_price, barcode")
      .eq("business_id", user.businessId)
      .eq("barcode", code)
      .maybeSingle();
    if (packaging) {
      matchedPackaging = packaging as unknown as PackagingUnitOption;
      const { data: parentProduct } = await supabase
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("id", matchedPackaging.productId)
        .eq("business_id", user.businessId)
        .eq("active", true)
        .maybeSingle();
      product = parentProduct;
    }
  }
  if (!product) return null;

  const { data: stock } = await supabase
    .from("product_stocks")
    .select("quantity")
    .eq("product_id", product.id as string)
    .eq("location_id", locationId)
    .maybeSingle();

  return { ...product, quantity: (stock?.quantity as number | undefined) ?? 0, matchedPackaging };
}

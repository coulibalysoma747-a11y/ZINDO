"use server";

import { supabase } from "@/lib/supabase";
import { requireUser } from "@/lib/auth";
import { isPackagingUnitsModuleEnabled } from "@/lib/actions/packaging-units";
import { isPriceTiersModuleEnabled } from "@/lib/actions/price-tiers";
import { getNearestExpiryByProduct, isExpiryModuleEnabled } from "@/lib/actions/expiry";
import { EXPIRY_ACTIVITIES } from "@/lib/nav";
import type { PriceTierOption } from "@/lib/pricing";
import { fetchAllPagesConcurrently } from "@/lib/supabase-paging";

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

/** Paliers de prix (voir lib/actions/price-tiers.ts) pour un lot de produits, regroupés par produit. */
async function fetchPriceTiersByProduct(businessId: string, productIds: string[]): Promise<Map<string, PriceTierOption[]>> {
  const map = new Map<string, PriceTierOption[]>();
  if (productIds.length === 0) return map;
  if (!(await isPriceTiersModuleEnabled(businessId))) return map;
  const { data } = await supabase
    .from("product_price_tiers")
    .select("id, productId:product_id, minQuantity:min_quantity, unitPrice:unit_price")
    .eq("business_id", businessId)
    .in("product_id", productIds);
  for (const row of (data ?? []) as unknown as (PriceTierOption & { productId: string })[]) {
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
    // "Autres noms" (ex. "Omo" pour "savon en poudre") : résolus séparément
    // puis inclus dans le même .or(), pour retrouver un produit par un nom
    // sous lequel il n'est pas affiché — voir supabase/schema.sql::product_aliases.
    const { data: aliasMatches } = await supabase
      .from("product_aliases")
      .select("productId:product_id, product:products!inner(businessId:business_id)")
      .eq("products.business_id", user.businessId)
      .ilike("alias", `%${escaped}%`);
    const aliasProductIds = [...new Set((aliasMatches ?? []).map((r) => r.productId as string))];
    q = q.or(
      `name.ilike.%${escaped}%,reference.ilike.%${escaped}%,barcode.ilike.%${escaped}%` +
        (aliasProductIds.length > 0 ? `,id.in.(${aliasProductIds.join(",")})` : "")
    );
  }

  const { data } = await q;
  const products = (data ?? []) as unknown as ProductRow[];
  const ids = products.map((p) => p.id);
  const [{ data: stocks }, packagingByProduct, priceTiersByProduct, nearestExpiryByProduct] = await Promise.all([
    ids.length
      ? supabase.from("product_stocks").select("productId:product_id, quantity").in("product_id", ids).eq("location_id", locationId)
      : Promise.resolve({ data: [] as { productId: string; quantity: number }[] }),
    fetchPackagingUnitsByProduct(user.businessId, ids),
    fetchPriceTiersByProduct(user.businessId, ids),
    getNearestExpiryByProduct(user.businessId, locationId, ids, user.business.activityKey),
  ]);

  const stockMap = new Map((stocks ?? []).map((s) => [s.productId as string, s.quantity as number]));
  return products.map((p) => ({
    ...p,
    quantity: stockMap.get(p.id) ?? 0,
    packagingUnits: packagingByProduct.get(p.id) ?? [],
    priceTiers: priceTiersByProduct.get(p.id) ?? [],
    nearestExpiry: nearestExpiryByProduct.get(p.id) ?? null,
  }));
}

/**
 * Tous les produits disponibles en stock dans la boutique active — utilisé pour
 * afficher automatiquement la grille de la caisse (Vente / Caisse) à l'ouverture,
 * sans attendre une recherche.
 */
export async function getPosProductsAction(locationId: string) {
  const user = await requireUser();
  const { businessId } = user;

  // Tout part en une seule vague : le stock (plusieurs pages à la fois),
  // les conditionnements, les paliers de prix et les dates de péremption de
  // tout le commerce, ainsi que les vérifications de modules. Auparavant, ces
  // compléments étaient lus par paquets de 150 produits, l'un après l'autre,
  // avec une vérification de module à chaque paquet : des dizaines
  // d'allers-retours en file pour un catalogue de quelques milliers de
  // produits, d'où l'attente avant l'affichage des produits à la caisse.
  //
  // Tout le stock de la boutique : un plafond fixe (anciennement 300 lignes,
  // sans ordre) rendait des produits pourtant en stock introuvables à la
  // caisse, puisque la recherche filtre cette liste côté navigateur.
  type StockRow = { quantity: number; product: ProductRow };
  const expiryApplies = EXPIRY_ACTIVITIES.includes(user.business.activityKey ?? "");
  const [rows, packagingEnabled, priceTiersEnabled, expiryEnabled, packagingRows, priceTierRows, expiryRows] =
    await Promise.all([
      fetchAllPagesConcurrently<StockRow>(
        (from, to) =>
          supabase
            .from("product_stocks")
            .select(`quantity, product:products!inner(${PRODUCT_FIELDS})`)
            .eq("location_id", locationId)
            .gt("quantity", 0)
            .eq("products.business_id", businessId)
            .eq("products.active", true)
            .order("product_id", { ascending: true })
            .range(from, to) as unknown as PromiseLike<{ data: StockRow[] | null; error: { message: string } | null }>,
        { maxRows: 10000 }
      ),
      isPackagingUnitsModuleEnabled(businessId),
      isPriceTiersModuleEnabled(businessId),
      expiryApplies ? isExpiryModuleEnabled(businessId) : false,
      fetchAllPagesConcurrently<PackagingUnitOption>((from, to) =>
        supabase
          .from("product_packaging_units")
          .select("id, productId:product_id, name, multiplier, salePrice:sale_price, barcode")
          .eq("business_id", businessId)
          .order("id", { ascending: true })
          .range(from, to) as unknown as PromiseLike<{ data: PackagingUnitOption[] | null; error: { message: string } | null }>
      ),
      fetchAllPagesConcurrently<PriceTierOption & { productId: string }>((from, to) =>
        supabase
          .from("product_price_tiers")
          .select("id, productId:product_id, minQuantity:min_quantity, unitPrice:unit_price")
          .eq("business_id", businessId)
          .order("id", { ascending: true })
          .range(from, to) as unknown as PromiseLike<{
          data: (PriceTierOption & { productId: string })[] | null;
          error: { message: string } | null;
        }>
      ),
      expiryApplies
        ? fetchAllPagesConcurrently<{ productId: string; expiryDate: string }>((from, to) =>
            supabase
              .from("product_expiry_batches")
              .select("productId:product_id, expiryDate:expiry_date")
              .eq("business_id", businessId)
              .eq("location_id", locationId)
              .order("expiry_date", { ascending: true })
              .order("id", { ascending: true })
              .range(from, to) as unknown as PromiseLike<{
              data: { productId: string; expiryDate: string }[] | null;
              error: { message: string } | null;
            }>
          )
        : [],
    ]);

  const packagingByProduct = new Map<string, PackagingUnitOption[]>();
  if (packagingEnabled) {
    for (const row of packagingRows) packagingByProduct.set(row.productId, [...(packagingByProduct.get(row.productId) ?? []), row]);
  }
  const priceTiersByProduct = new Map<string, PriceTierOption[]>();
  if (priceTiersEnabled) {
    for (const { productId, ...tier } of priceTierRows) {
      priceTiersByProduct.set(productId, [...(priceTiersByProduct.get(productId) ?? []), tier as PriceTierOption]);
    }
  }
  // Lots triés par date de péremption croissante : le premier vu par produit
  // est le plus proche (même règle que getNearestExpiryByProduct).
  const nearestExpiryByProduct = new Map<string, string>();
  if (expiryEnabled) {
    for (const row of expiryRows) if (!nearestExpiryByProduct.has(row.productId)) nearestExpiryByProduct.set(row.productId, row.expiryDate);
  }

  return rows
    .map((s) => ({
      ...s.product,
      quantity: s.quantity,
      packagingUnits: packagingByProduct.get(s.product.id) ?? [],
      priceTiers: priceTiersByProduct.get(s.product.id) ?? [],
      nearestExpiry: nearestExpiryByProduct.get(s.product.id) ?? null,
    }))
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

  const [{ data: stock }, priceTiersByProduct] = await Promise.all([
    supabase.from("product_stocks").select("quantity").eq("product_id", product.id as string).eq("location_id", locationId).maybeSingle(),
    fetchPriceTiersByProduct(user.businessId, [product.id as string]),
  ]);

  return {
    ...product,
    quantity: (stock?.quantity as number | undefined) ?? 0,
    priceTiers: priceTiersByProduct.get(product.id as string) ?? [],
    matchedPackaging,
  };
}

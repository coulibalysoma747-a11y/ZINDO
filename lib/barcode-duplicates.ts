import "server-only";
import { supabase } from "@/lib/supabase";

/**
 * Un même code-barres ne doit désigner qu'une seule chose au scan : un
 * produit OU un conditionnement. Renvoie le message à afficher (avec le nom
 * du produit déjà concerné) si le code est pris, sinon null.
 */
export async function findBarcodeDuplicate(
  businessId: string,
  barcode: string,
  exclude?: { productId?: string; packagingUnitId?: string }
): Promise<string | null> {
  let productQuery = supabase
    .from("products")
    .select("id, name")
    .eq("business_id", businessId)
    .eq("barcode", barcode)
    .limit(1);
  if (exclude?.productId) productQuery = productQuery.neq("id", exclude.productId);

  let packagingQuery = supabase
    .from("product_packaging_units")
    .select("id, name, product:products(name)")
    .eq("business_id", businessId)
    .eq("barcode", barcode)
    .limit(1);
  if (exclude?.packagingUnitId) packagingQuery = packagingQuery.neq("id", exclude.packagingUnitId);

  const [{ data: products }, { data: units }] = await Promise.all([productQuery, packagingQuery]);

  const product = products?.[0];
  if (product) return `Ce code-barres est déjà utilisé par le produit « ${product.name} »`;

  const unit = units?.[0] as unknown as { name: string; product: { name: string } | null } | undefined;
  if (unit) {
    return `Ce code-barres est déjà utilisé par le conditionnement « ${unit.name} » du produit « ${unit.product?.name ?? "?"} »`;
  }
  return null;
}

"use server";

import { supabase } from "@/lib/supabase";
import { requireUser, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { isGlobalSearchEnabled } from "@/lib/global-search";

export type GlobalSearchResult = {
  products: { id: string; name: string; reference: string; salePrice: number }[];
  customers: { id: string; name: string; phone: string | null }[];
  suppliers: { id: string; name: string; company: string | null; phone: string | null }[];
  sales: { id: string; number: string; total: number; createdAt: string }[];
};

const EMPTY: GlobalSearchResult = { products: [], customers: [], suppliers: [], sales: [] };
const LIMIT = 5;

/**
 * Recherche globale (barre de l'en-tête) : quelques résultats par rubrique,
 * limités à ce que le rôle de l'utilisateur a le droit de consulter.
 */
export async function globalSearchAction(query: string): Promise<GlobalSearchResult> {
  const user = await requireUser();
  const trimmed = query.trim();
  if (trimmed.length < 2) return EMPTY;
  if (!(await isGlobalSearchEnabled(user.businessId))) return EMPTY;

  // Virgules et parenthèses séparent les conditions du filtre .or() : on les
  // remplace par des espaces plutôt que de tenter de les échapper.
  const escaped = trimmed.replace(/[,()]/g, " ").replace(/[%_\\]/g, (m) => `\\${m}`);
  const like = `%${escaped}%`;

  const [canProducts, canCustomers, canSuppliers, canSales] = await Promise.all([
    hasPermission(user.businessId, user.role, PERMISSIONS.PRODUCTS_VIEW, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.CUSTOMERS_VIEW, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.SUPPLIERS_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.SALES_VIEW, user.id),
  ]);

  const [products, customers, suppliers, sales] = await Promise.all([
    canProducts
      ? supabase
          .from("products")
          .select("id, name, reference, salePrice:sale_price")
          .eq("business_id", user.businessId)
          .eq("active", true)
          .or(`name.ilike.${like},reference.ilike.${like},barcode.ilike.${like}`)
          .order("name")
          .limit(LIMIT)
      : null,
    canCustomers
      ? supabase
          .from("customers")
          .select("id, name, phone")
          .eq("business_id", user.businessId)
          .or(`name.ilike.${like},phone.ilike.${like}`)
          .order("name")
          .limit(LIMIT)
      : null,
    canSuppliers
      ? supabase
          .from("suppliers")
          .select("id, name, company, phone")
          .eq("business_id", user.businessId)
          .or(`name.ilike.${like},company.ilike.${like},phone.ilike.${like}`)
          .order("name")
          .limit(LIMIT)
      : null,
    canSales
      ? supabase
          .from("sales")
          .select("id, number, total, createdAt:created_at")
          .eq("business_id", user.businessId)
          .ilike("number", like)
          .order("created_at", { ascending: false })
          .limit(LIMIT)
      : null,
  ]);

  return {
    products: (products?.data ?? []) as GlobalSearchResult["products"],
    customers: (customers?.data ?? []) as GlobalSearchResult["customers"],
    suppliers: (suppliers?.data ?? []) as GlobalSearchResult["suppliers"],
    sales: (sales?.data ?? []) as GlobalSearchResult["sales"],
  };
}

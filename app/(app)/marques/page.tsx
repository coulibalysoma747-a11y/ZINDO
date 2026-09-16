import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { CatalogTabs } from "@/components/products/CatalogTabs";
import { BrandManager } from "./BrandManager";

export default async function BrandsPage() {
  const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);

  const [{ data: brands }, { data: products }] = await Promise.all([
    supabase.from("brands").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    supabase.from("products").select("brand").eq("business_id", user.businessId),
  ]);

  const countByBrand = new Map<string, number>();
  for (const p of products ?? []) {
    const key = p.brand as string | null;
    if (!key) continue;
    countByBrand.set(key, (countByBrand.get(key) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Marques</h1>
        <p className="text-sm text-zinc-500">Gérez les marques de vos produits.</p>
      </div>
      <CatalogTabs active="marques" />
      <BrandManager
        brands={(brands ?? []).map((b) => ({
          id: b.id as string,
          name: b.name as string,
          productCount: countByBrand.get(b.name as string) ?? 0,
        }))}
      />
    </div>
  );
}

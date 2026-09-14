import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { CategoryManager } from "./CategoryManager";

export default async function CategoriesPage() {
  const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, description")
      .eq("business_id", user.businessId)
      .order("name", { ascending: true }),
    supabase.from("products").select("categoryId:category_id").eq("business_id", user.businessId),
  ]);

  const countByCategory = new Map<string, number>();
  for (const p of products ?? []) {
    const key = p.categoryId as string | null;
    if (!key) continue;
    countByCategory.set(key, (countByCategory.get(key) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Catégories</h1>
        <p className="text-sm text-zinc-500">Organisez vos produits par catégorie.</p>
      </div>
      <CategoryManager
        categories={(categories ?? []).map((c) => ({
          id: c.id as string,
          name: c.name as string,
          description: c.description as string | null,
          productCount: countByCategory.get(c.id as string) ?? 0,
        }))}
      />
    </div>
  );
}

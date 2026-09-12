import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CategoryManager } from "./CategoryManager";

export default async function CategoriesPage() {
  const user = await requirePermission(PERMISSIONS.CATEGORIES_MANAGE);

  const categories = await prisma.category.findMany({
    where: { businessId: user.businessId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Catégories</h1>
        <p className="text-sm text-zinc-500">Organisez vos produits par catégorie.</p>
      </div>
      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          productCount: c._count.products,
        }))}
      />
    </div>
  );
}

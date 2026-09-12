import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getLocations } from "@/lib/location";
import { getActivityConfig } from "@/lib/activity-config";
import { ProductForm } from "@/components/products/ProductForm";
import { updateProductAction } from "@/lib/actions/products";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const { id } = await params;

  const [product, categories, suppliers, locations, activityConfig] = await Promise.all([
    prisma.product.findFirst({ where: { id, businessId: user.businessId } }),
    prisma.category.findMany({ where: { businessId: user.businessId }, orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ where: { businessId: user.businessId }, orderBy: { name: "asc" } }),
    getLocations(user.businessId),
    getActivityConfig(user.business.activityKey),
  ]);

  if (!product) notFound();

  let parsedCustomFields: Record<string, string> = {};
  if (product.customFields) {
    try {
      parsedCustomFields = JSON.parse(product.customFields);
    } catch {
      parsedCustomFields = {};
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Modifier le produit</h1>
        <p className="text-sm text-zinc-500">{product.name}</p>
      </div>
      <ProductForm
        action={updateProductAction.bind(null, id)}
        categories={categories}
        suppliers={suppliers}
        locations={locations}
        customFieldDefs={activityConfig.customFields}
        initial={{ ...product, customFields: parsedCustomFields }}
        submitLabel="Enregistrer les modifications"
      />
    </div>
  );
}

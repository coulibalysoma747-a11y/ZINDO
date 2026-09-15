import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getLocations } from "@/lib/location";
import { getActivityConfig } from "@/lib/activity-config";
import { MOTO_ACTIVITY_KEY } from "@/lib/activities";
import { ProductForm } from "@/components/products/ProductForm";
import { updateProductAction } from "@/lib/actions/products";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const { id } = await params;

  const [{ data: product }, { data: categories }, { data: suppliers }, locations, activityConfig] = await Promise.all([
    supabase
      .from("products")
      .select(
        "name, reference, categoryId:category_id, brand, description, unit, purchasePrice:purchase_price, salePrice:sale_price, minStock:min_stock, shelfLocation:shelf_location, supplierId:supplier_id, barcode, photoUrl:photo_url, customFields:custom_fields, trackUnits:track_units"
      )
      .eq("id", id)
      .eq("business_id", user.businessId)
      .maybeSingle(),
    supabase.from("categories").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    supabase.from("suppliers").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    getLocations(user.businessId),
    getActivityConfig(user.business.activityKey),
  ]);

  if (!product) notFound();

  let parsedCustomFields: Record<string, string> = {};
  if (product.customFields) {
    try {
      parsedCustomFields = JSON.parse(product.customFields as string);
    } catch {
      parsedCustomFields = {};
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Modifier le produit</h1>
        <p className="text-sm text-zinc-500">{product.name as string}</p>
      </div>
      <ProductForm
        action={updateProductAction.bind(null, id)}
        categories={categories ?? []}
        suppliers={suppliers ?? []}
        locations={locations}
        customFieldDefs={activityConfig.customFields}
        showTrackUnits={user.business.activityKey === MOTO_ACTIVITY_KEY}
        initial={{
          name: product.name as string,
          reference: product.reference as string,
          categoryId: product.categoryId as string | null,
          brand: product.brand as string | null,
          description: product.description as string | null,
          unit: product.unit as string,
          purchasePrice: product.purchasePrice as number,
          salePrice: product.salePrice as number,
          minStock: product.minStock as number,
          shelfLocation: product.shelfLocation as string | null,
          supplierId: product.supplierId as string | null,
          barcode: product.barcode as string | null,
          photoUrl: product.photoUrl as string | null,
          customFields: parsedCustomFields,
          trackUnits: product.trackUnits as boolean,
        }}
        submitLabel="Enregistrer les modifications"
      />
    </div>
  );
}

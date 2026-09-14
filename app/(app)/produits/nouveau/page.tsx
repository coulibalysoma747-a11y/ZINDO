import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { getActivityConfig } from "@/lib/activity-config";
import { ProductForm } from "@/components/products/ProductForm";
import { createProductAction } from "@/lib/actions/products";

export default async function NewProductPage() {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);

  const [{ data: categories }, { data: suppliers }, locations, currentLocation, activityConfig] = await Promise.all([
    supabase.from("categories").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    supabase.from("suppliers").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
    getActivityConfig(user.business.activityKey),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Nouveau produit</h1>
        <p className="text-sm text-zinc-500">Renseignez les informations de l&apos;article.</p>
      </div>
      <ProductForm
        action={createProductAction}
        categories={categories ?? []}
        suppliers={suppliers ?? []}
        locations={locations}
        defaultLocationId={currentLocation?.id}
        customFieldDefs={activityConfig.customFields}
        submitLabel="Créer le produit"
      />
    </div>
  );
}

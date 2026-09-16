import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { getActivityConfig } from "@/lib/activity-config";
import { MOTO_ACTIVITY_KEY } from "@/lib/activities";
import { ProductForm } from "@/components/products/ProductForm";
import { createProductAction } from "@/lib/actions/products";
import { isPackagingUnitsModuleEnabled } from "@/lib/actions/packaging-units";

export default async function NewProductPage() {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);

  const [{ data: categories }, { data: brands }, { data: suppliers }, locations, currentLocation, activityConfig, packagingEnabled] = await Promise.all([
    supabase.from("categories").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    supabase.from("brands").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    supabase.from("suppliers").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
    getActivityConfig(user.business.activityKey),
    isPackagingUnitsModuleEnabled(user.businessId),
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
        brands={brands ?? []}
        suppliers={suppliers ?? []}
        locations={locations}
        defaultLocationId={currentLocation?.id}
        customFieldDefs={activityConfig.customFields}
        showTrackUnits={user.business.activityKey === MOTO_ACTIVITY_KEY}
        packagingEnabled={packagingEnabled}
        submitLabel="Créer le produit"
      />
    </div>
  );
}

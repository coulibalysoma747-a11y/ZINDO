import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { InventoryForm } from "./InventoryForm";

type ProductRow = {
  id: string;
  name: string;
  reference: string;
  unit: string;
  stocks: { locationId: string; quantity: number }[];
};

export default async function NewInventoryPage() {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE);

  const [{ data: products }, locations, currentLocation] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, reference, unit, stocks:product_stocks(locationId:location_id, quantity)")
      .eq("business_id", user.businessId)
      .eq("active", true)
      .order("name", { ascending: true }),
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Nouvel inventaire</h1>
        <p className="text-sm text-zinc-500">
          Choisissez la boutique puis saisissez la quantité réellement comptée pour chaque produit. Les
          écarts seront calculés automatiquement.
        </p>
      </div>
      <InventoryForm
        products={(products ?? []) as unknown as ProductRow[]}
        locations={locations}
        defaultLocationId={currentLocation?.id}
      />
    </div>
  );
}

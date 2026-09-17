import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { RentalForm } from "./RentalForm";

export default async function NewRentalPage() {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  const [{ data: customers }, locations, currentLocation] = await Promise.all([
    supabase.from("customers").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Nouvelle location</h1>
        <p className="text-sm text-zinc-500">Enregistrez le prêt d&apos;un produit à un client, avec tarif et date de retour prévue.</p>
      </div>
      <RentalForm
        customers={customers ?? []}
        locations={locations}
        defaultLocationId={currentLocation?.id}
        currency={user.business.currency}
      />
    </div>
  );
}

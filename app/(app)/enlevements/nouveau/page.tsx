import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { PickupForm } from "./PickupForm";

export default async function NewPickupPage() {
  const user = await requirePermission(PERMISSIONS.STOCK_MANAGE);
  const [locations, currentLocation] = await Promise.all([
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Nouvel enlèvement</h1>
        <p className="text-sm text-zinc-500">
          Un confrère prend de la marchandise chez vous. Le stock sort immédiatement ; le solde non réglé se suit
          depuis la liste des enlèvements.
        </p>
      </div>
      <PickupForm
        locations={locations.map((l) => ({ id: l.id as string, name: l.name as string }))}
        defaultLocationId={currentLocation?.id}
        currency={user.business.currency}
      />
    </div>
  );
}

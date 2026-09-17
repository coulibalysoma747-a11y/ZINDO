import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { ShipmentForm } from "./ShipmentForm";

export default async function NewShipmentPage() {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);
  const [locations, currentLocation] = await Promise.all([
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Nouvelle expédition</h1>
        <p className="text-sm text-zinc-500">
          Ne touche jamais au stock — la marchandise est déjà sortie par la facture à laquelle ce colis se
          rattache, si applicable.
        </p>
      </div>
      <ShipmentForm
        locations={locations.map((l) => ({ id: l.id as string, name: l.name as string }))}
        defaultLocationId={currentLocation?.id}
      />
    </div>
  );
}

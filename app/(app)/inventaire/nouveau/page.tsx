import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { InventoryForm } from "./InventoryForm";

export default async function NewInventoryPage() {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE);

  const [products, locations, currentLocation] = await Promise.all([
    prisma.product.findMany({
      where: { businessId: user.businessId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, reference: true, unit: true, stocks: { select: { locationId: true, quantity: true } } },
    }),
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
      <InventoryForm products={products} locations={locations} defaultLocationId={currentLocation?.id} />
    </div>
  );
}

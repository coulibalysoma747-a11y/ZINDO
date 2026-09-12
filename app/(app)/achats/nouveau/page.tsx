import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { PurchaseForm } from "./PurchaseForm";

export default async function NewPurchasePage() {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);

  const [suppliers, locations, currentLocation] = await Promise.all([
    prisma.supplier.findMany({
      where: { businessId: user.businessId },
      orderBy: { name: "asc" },
    }),
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Nouvel achat</h1>
        <p className="text-sm text-zinc-500">
          Enregistrez la réception d&apos;une marchandise : le stock de la boutique choisie sera mis à
          jour automatiquement.
        </p>
      </div>
      <PurchaseForm
        suppliers={suppliers}
        locations={locations}
        defaultLocationId={currentLocation?.id}
        currency={user.business.currency}
      />
    </div>
  );
}

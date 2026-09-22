import { redirect } from "next/navigation";
import { CalendarX2 } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { EXPIRY_ACTIVITIES } from "@/lib/nav";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { ensureExpiryFlagRegistered, isExpiryModuleEnabled, getExpiryBatchesAction } from "@/lib/actions/expiry";
import { ExpiryTracker } from "./ExpiryTracker";

export default async function ExpiryPage() {
  const user = await requirePermission(PERMISSIONS.EXPIRY_MANAGE);
  if (!user.business.activityKey || !EXPIRY_ACTIVITIES.includes(user.business.activityKey)) redirect("/dashboard");

  await ensureExpiryFlagRegistered();
  if (!(await isExpiryModuleEnabled(user.businessId))) redirect("/dashboard");

  const [locations, currentLocation, batches] = await Promise.all([
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
    getExpiryBatchesAction(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <CalendarX2 className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Péremption (DLC)</h1>
          <p className="text-sm text-zinc-500">
            Enregistrez la date de péremption des lots reçus pour repérer les produits bientôt périmés. Ce suivi ne
            modifie pas le stock — pensez à faire une sortie (motif « Produit endommagé »/« Perte ») si vous jetez de
            la marchandise.
          </p>
        </div>
      </div>

      <ExpiryTracker
        locations={locations.map((l) => ({ id: l.id as string, name: l.name as string }))}
        defaultLocationId={currentLocation?.id as string | undefined}
        batches={batches}
      />
    </div>
  );
}

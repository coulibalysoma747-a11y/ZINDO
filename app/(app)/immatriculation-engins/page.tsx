import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { MOTO_ACTIVITY_KEY } from "@/lib/activities";
import { listVehicleRegistrationsAction } from "@/lib/actions/vehicle-registrations";
import { EmptyState } from "@/components/ui/Empty";
import { ImmatriculationOverview } from "./ImmatriculationOverview";

export default async function ImmatriculationEnginsPage() {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  if (user.business.activityKey !== MOTO_ACTIVITY_KEY) {
    return (
      <EmptyState
        title="Module réservé à l'activité Boutique de motos"
        description="Ce module n'est disponible que pour les commerces dont l'activité est « Boutique de motos »."
      />
    );
  }

  const { dossiers, counts } = await listVehicleRegistrationsAction();

  return <ImmatriculationOverview dossiers={dossiers} counts={counts} currency={user.business.currency} />;
}

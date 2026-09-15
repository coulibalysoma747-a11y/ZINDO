import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { MOTO_ACTIVITY_KEY } from "@/lib/activities";
import { listVehicleSalesAction } from "@/lib/actions/vehicle-sales";
import { EmptyState } from "@/components/ui/Empty";
import { VehicleSalesHistory } from "./VehicleSalesHistory";

export default async function VenteEnginPage() {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);

  if (user.business.activityKey !== MOTO_ACTIVITY_KEY) {
    return (
      <EmptyState
        title="Module réservé à l'activité Boutique de motos"
        description="Ce module n'est disponible que pour les commerces dont l'activité est « Boutique de motos »."
      />
    );
  }

  const sales = await listVehicleSalesAction();

  return <VehicleSalesHistory sales={sales} currency={user.business.currency} />;
}

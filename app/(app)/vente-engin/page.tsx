import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getCurrentLocation } from "@/lib/location";
import { getEnabledPaymentMethods } from "@/lib/actions/sales";
import { getVehicleModelsAction } from "@/lib/actions/vehicle-units";
import { MOTO_ACTIVITY_KEY } from "@/lib/activities";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { OpenSessionForm } from "@/app/(app)/ventes/OpenSessionForm";
import { VenteEnginForm } from "./VenteEnginForm";

// Vente d'un engin : recherche moins volumineuse qu'à la caisse générale,
// mais l'enregistrement de la vente fait les mêmes appels réseau vers
// Supabase (createSaleAction) — même marge de sécurité que /ventes.
export const maxDuration = 30;

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

  const currentLocation = await getCurrentLocation(user.businessId);
  if (!currentLocation) {
    return (
      <EmptyState
        title="Aucune boutique configurée"
        description="Créez une boutique avant d'effectuer des ventes."
        action={<ButtonLink href="/boutiques">Configurer une boutique</ButtonLink>}
      />
    );
  }

  const { data: activeSession } = await supabase
    .from("cash_sessions")
    .select("id, number, openedAt:opened_at, user:users(firstName:first_name, lastName:last_name)")
    .eq("business_id", user.businessId)
    .eq("location_id", currentLocation.id)
    .eq("status", "OUVERTE")
    .maybeSingle();

  if (!activeSession) {
    return <OpenSessionForm locationName={currentLocation.name} />;
  }
  const session = activeSession as unknown as {
    id: string;
    number: string;
    openedAt: string;
    user: { firstName: string; lastName: string };
  };

  const [{ data: customers }, paymentMethods, vehicleModels] = await Promise.all([
    supabase.from("customers").select("id, name, phone").eq("business_id", user.businessId).order("name", { ascending: true }),
    getEnabledPaymentMethods(),
    getVehicleModelsAction(currentLocation.id),
  ]);

  return (
    <VenteEnginForm
      vehicleModels={vehicleModels}
      customers={customers ?? []}
      paymentMethods={paymentMethods}
      currency={user.business.currency}
      locationId={currentLocation.id}
      locationName={currentLocation.name}
      autoPrintReceipt={user.autoPrintReceipt}
      session={{
        id: session.id,
        number: session.number,
        openedAt: new Date(session.openedAt).toISOString(),
        cashierName: `${session.user.firstName} ${session.user.lastName}`,
      }}
      businessInfo={{
        businessName: user.business.name,
        businessActivity: user.business.activity,
        businessPhone: user.business.phone,
        businessAddress: user.business.address,
        businessCity: user.business.city,
        logoUrl: user.business.logoUrl,
        locationName: currentLocation.name,
        locationAddress: currentLocation.address,
        currency: user.business.currency,
        footerMessage: user.business.ticketFooter,
      }}
    />
  );
}

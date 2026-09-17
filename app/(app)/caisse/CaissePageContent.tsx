import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getCurrentLocation } from "@/lib/location";
import { getEnabledPaymentMethods } from "@/lib/actions/sales";
import { getBusinessSettings } from "@/lib/business-settings";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { OpenSessionForm } from "@/app/(app)/ventes/OpenSessionForm";
import { CaissePOS } from "./CaissePOS";

/**
 * "Caisse à deux" (Paramètres > Modules) : module séparé de Vente — un
 * vendeur y prépare un panier et l'envoie à la caisse (voir POS.tsx), un
 * caissier le récupère et finalise le paiement ici. Partage la même session
 * de caisse ouverte que Vente (une seule session par boutique à la fois).
 */
export async function CaissePageContent() {
  const user = await requirePermission(PERMISSIONS.CASHIER_QUEUE_MANAGE);
  const currentLocation = await getCurrentLocation(user.businessId);

  if (!currentLocation) {
    return (
      <EmptyState
        title="Aucune boutique configurée"
        description="Créez une boutique avant d'encaisser."
        action={<ButtonLink href="/boutiques">Configurer une boutique</ButtonLink>}
      />
    );
  }

  const { data: activeSession } = await supabase
    .from("cash_sessions")
    .select("id")
    .eq("business_id", user.businessId)
    .eq("location_id", currentLocation.id)
    .eq("status", "OUVERTE")
    .maybeSingle();

  if (!activeSession) {
    return <OpenSessionForm locationName={currentLocation.name} />;
  }

  const [businessSettings, paymentMethods] = await Promise.all([
    getBusinessSettings(user.businessId),
    getEnabledPaymentMethods(),
  ]);

  return (
    <CaissePOS
      locationId={currentLocation.id}
      locationName={currentLocation.name}
      currency={user.business.currency}
      paymentMethods={paymentMethods}
      mobileMoneyOperators={businessSettings.mobileMoneyOperators}
      allowMixedPayment={businessSettings.allowMixedPayment}
      autoPrintReceipt={user.autoPrintReceipt}
    />
  );
}

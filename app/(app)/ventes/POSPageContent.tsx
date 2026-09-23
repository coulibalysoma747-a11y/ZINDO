import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getCurrentLocation } from "@/lib/location";
import { getEnabledPaymentMethods } from "@/lib/actions/sales";
import { getBusinessSettings } from "@/lib/business-settings";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { OpenSessionForm } from "./OpenSessionForm";
import { POS } from "./POS";

/**
 * Chargement de données partagé entre les deux modules de vente — "Vente /
 * Caisse" (ticket rapide) et "Facture A4" (facture détaillée) — qui
 * s'appuient tous deux sur la même caisse ouverte, le même panier et le même
 * moteur de création de vente ; seul le document final imprimé diffère.
 */
export async function POSPageContent({ mode }: { mode: "pos" | "facture" }) {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
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

  const businessSettings = await getBusinessSettings(user.businessId);

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

  const [{ data: customers }, paymentMethods, canEditProducts, canSeeMargin] = await Promise.all([
    supabase.from("customers").select("id, name, phone").eq("business_id", user.businessId).order("name", { ascending: true }),
    getEnabledPaymentMethods(),
    hasPermission(user.businessId, user.role, PERMISSIONS.PRODUCTS_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.REPORTS_VIEW, user.id),
  ]);

  return (
    <POS
      mode={mode}
      customers={customers ?? []}
      paymentMethods={paymentMethods}
      currency={user.business.currency}
      locationId={currentLocation.id}
      locationName={currentLocation.name}
      canEditProducts={canEditProducts}
      canSeeMargin={canSeeMargin}
      hideCustomerInPos={businessSettings.hideCustomerInPos}
      quantityInputMode={businessSettings.posQuantityInputMode}
      mobileMoneyOperators={businessSettings.mobileMoneyOperators}
      allowMixedPayment={businessSettings.allowMixedPayment}
      aiCartEnabled={businessSettings.aiCartEnabled}
      cashierQueueEnabled={businessSettings.modulesEnabled.cashierQueue}
      autoPrintReceipt={user.autoPrintReceipt}
      printerTicketWidth={user.printerTicketWidth}
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

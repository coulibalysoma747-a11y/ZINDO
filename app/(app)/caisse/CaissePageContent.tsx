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
import { isDesktopBuild, isSupabaseReachable, readPageCache, writePageCache } from "@/lib/offline/server-cache";
import type { PaymentMethod } from "@/lib/db-types";
import type { CachedBusinessInfo } from "@/lib/offline/db";

type CaissePageCache = {
  locationId: string;
  locationName: string;
  currency: string;
  paymentMethods: { method: PaymentMethod; label: string }[];
  mobileMoneyOperators: ("ORANGE" | "MOOV" | "WAVE")[];
  allowMixedPayment: boolean;
  autoPrintReceipt: boolean;
  hasActiveSession: boolean;
  cashierName: string;
  businessInfo: CachedBusinessInfo;
};

/**
 * "Caisse à deux" (Paramètres > Modules) : module séparé de Vente — un
 * vendeur y prépare un panier et l'envoie à la caisse (voir POS.tsx), un
 * caissier le récupère et finalise le paiement ici. Partage la même session
 * de caisse ouverte que Vente (une seule session par boutique à la fois).
 *
 * getCurrentLocation()/getBusinessSettings()/getEnabledPaymentMethods()
 * avalent tous silencieusement une erreur réseau Supabase et renvoient une
 * valeur par défaut trompeuse (voir lib/offline/server-cache.ts) — on vérifie
 * donc explicitement la connectivité AVANT de les appeler, pour ne jamais
 * afficher "aucune boutique configurée" ou "aucune session ouverte" à la
 * place du vrai message "hors connexion".
 */
export async function CaissePageContent() {
  const user = await requirePermission(PERMISSIONS.CASHIER_QUEUE_MANAGE);
  const cacheKey = `caisse:${user.businessId}`;

  if (isDesktopBuild() && !(await isSupabaseReachable())) {
    const cached = await readPageCache<CaissePageCache>(cacheKey);
    if (!cached) {
      return (
        <EmptyState
          title="Hors connexion"
          description="Connectez-vous à Internet au moins une fois avant de pouvoir utiliser la caisse hors ligne."
        />
      );
    }
    if (!cached.hasActiveSession) {
      return <OpenSessionForm locationName={cached.locationName} />;
    }
    return (
      <CaissePOS
        locationId={cached.locationId}
        locationName={cached.locationName}
        currency={cached.currency}
        paymentMethods={cached.paymentMethods}
        mobileMoneyOperators={cached.mobileMoneyOperators}
        allowMixedPayment={cached.allowMixedPayment}
        autoPrintReceipt={cached.autoPrintReceipt}
        cashierName={cached.cashierName}
        businessInfo={cached.businessInfo}
      />
    );
  }

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

  const [businessSettings, paymentMethods] = await Promise.all([
    getBusinessSettings(user.businessId),
    getEnabledPaymentMethods(),
  ]);

  const businessInfo: CachedBusinessInfo = {
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
  };
  const cashierName = `${user.firstName} ${user.lastName}`;

  if (isDesktopBuild()) {
    void writePageCache<CaissePageCache>(cacheKey, {
      locationId: currentLocation.id,
      locationName: currentLocation.name,
      currency: user.business.currency,
      paymentMethods,
      mobileMoneyOperators: businessSettings.mobileMoneyOperators,
      allowMixedPayment: businessSettings.allowMixedPayment,
      autoPrintReceipt: user.autoPrintReceipt,
      hasActiveSession: !!activeSession,
      cashierName,
      businessInfo,
    });
  }

  if (!activeSession) {
    return <OpenSessionForm locationName={currentLocation.name} />;
  }

  return (
    <CaissePOS
      locationId={currentLocation.id}
      locationName={currentLocation.name}
      currency={user.business.currency}
      paymentMethods={paymentMethods}
      mobileMoneyOperators={businessSettings.mobileMoneyOperators}
      allowMixedPayment={businessSettings.allowMixedPayment}
      autoPrintReceipt={user.autoPrintReceipt}
      cashierName={cashierName}
      businessInfo={businessInfo}
    />
  );
}

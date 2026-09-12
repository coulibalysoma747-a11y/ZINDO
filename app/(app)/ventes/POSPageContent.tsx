import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getCurrentLocation } from "@/lib/location";
import { getEnabledPaymentMethods } from "@/lib/actions/sales";
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

  const activeSession = await prisma.cashSession.findFirst({
    where: { businessId: user.businessId, locationId: currentLocation.id, status: "OUVERTE" },
    include: { user: true },
  });

  if (!activeSession) {
    return <OpenSessionForm locationName={currentLocation.name} />;
  }

  const [customers, paymentMethods, canEditProducts] = await Promise.all([
    prisma.customer.findMany({
      where: { businessId: user.businessId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
    getEnabledPaymentMethods(),
    hasPermission(user.businessId, user.role, PERMISSIONS.PRODUCTS_MANAGE, user.id),
  ]);

  return (
    <POS
      mode={mode}
      customers={customers}
      paymentMethods={paymentMethods}
      currency={user.business.currency}
      locationId={currentLocation.id}
      locationName={currentLocation.name}
      canEditProducts={canEditProducts}
      autoPrintReceipt={user.autoPrintReceipt}
      printerTicketWidth={user.printerTicketWidth}
      session={{
        id: activeSession.id,
        number: activeSession.number,
        openedAt: activeSession.openedAt.toISOString(),
        cashierName: `${activeSession.user.firstName} ${activeSession.user.lastName}`,
      }}
    />
  );
}

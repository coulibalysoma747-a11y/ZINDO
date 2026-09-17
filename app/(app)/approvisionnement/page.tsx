import { notFound } from "next/navigation";
import { Truck } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { getBusinessSettings } from "@/lib/business-settings";
import { getQuickSuppliesAction } from "@/lib/actions/quick-supply";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatMoney, formatDateTime } from "@/lib/format";
import { QuickSupplyForm } from "./QuickSupplyForm";

export default async function QuickSupplyPage() {
  const user = await requirePermission(PERMISSIONS.STOCK_MANAGE);
  const businessSettings = await getBusinessSettings(user.businessId);
  if (!businessSettings.modulesEnabled.quickSupply) notFound();

  const [locations, currentLocation, history] = await Promise.all([
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
    getQuickSuppliesAction(),
  ]);
  const currency = user.business.currency;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Approvisionnement rapide</h1>
          <p className="text-sm text-zinc-500">
            Faites entrer de la marchandise en 30 secondes — sans fournisseur ni bon de commande. Pour un achat
            organisé avec un vrai fournisseur, utilisez plutôt Achats.
          </p>
        </div>
      </div>

      <QuickSupplyForm
        locations={locations.map((l) => ({ id: l.id as string, name: l.name as string }))}
        defaultLocationId={currentLocation?.id as string | undefined}
        currency={currency}
      />

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Historique</h2>
          </CardHeader>
          <CardBody className="space-y-2 p-0">
            <div className="divide-y divide-zinc-100">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{h.product?.name ?? "Produit supprimé"}</p>
                    <p className="text-xs text-zinc-500">
                      {formatDateTime(new Date(h.createdAt))} · {h.user.firstName} {h.user.lastName}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-zinc-900">{formatMoney(h.total, currency)}</p>
                    <p className="text-xs text-zinc-400">
                      {h.quantity} × {formatMoney(h.unitPrice, currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

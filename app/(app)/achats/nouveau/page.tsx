import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { PurchaseForm } from "./PurchaseForm";
import { isPurchaseOrdersModuleEnabled } from "@/lib/actions/purchase-orders";

// Marge de sécurité pour l'enregistrement d'un achat (plusieurs appels réseau
// vers Supabase par article, même parallélisés).
export const maxDuration = 30;

export default async function NewPurchasePage() {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);

  const [{ data: suppliers }, locations, currentLocation, showTransport] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
    isPurchaseOrdersModuleEnabled(user.businessId),
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
        suppliers={suppliers ?? []}
        locations={locations}
        defaultLocationId={currentLocation?.id}
        currency={user.business.currency}
        showTransport={showTransport}
      />
    </div>
  );
}

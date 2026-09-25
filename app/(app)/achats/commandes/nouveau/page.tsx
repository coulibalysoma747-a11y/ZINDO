import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { isPurchaseOrdersModuleEnabled } from "@/lib/actions/purchase-orders";
import { PurchaseOrderForm } from "./PurchaseOrderForm";

export default async function NewPurchaseOrderPage() {
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);
  if (!(await isPurchaseOrdersModuleEnabled(user.businessId))) notFound();

  const [{ data: suppliers }, locations, currentLocation] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("business_id", user.businessId).order("name"),
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-slate-100">Nouvelle demande de prix</h1>
        <p className="text-sm text-zinc-500">
          Le document envoyé ne contient aucun prix : le fournisseur vous communique les siens. Choisissez plusieurs
          fournisseurs pour les mettre en concurrence.
        </p>
      </div>
      <PurchaseOrderForm
        suppliers={(suppliers ?? []) as { id: string; name: string }[]}
        locations={locations.map((l) => ({ id: l.id as string, name: l.name as string }))}
        defaultLocationId={currentLocation?.id}
      />
    </div>
  );
}

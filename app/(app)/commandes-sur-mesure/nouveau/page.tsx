import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ARTISAN_ACTIVITY_KEY } from "@/lib/nav";
import { ensureCustomOrdersFlagRegistered, isCustomOrdersModuleEnabled } from "@/lib/actions/custom-orders";
import { supabase } from "@/lib/supabase";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { CustomOrderForm } from "./CustomOrderForm";

export default async function NewCustomOrderPage() {
  const user = await requirePermission(PERMISSIONS.CUSTOM_ORDERS_MANAGE);
  if (user.business.activityKey !== ARTISAN_ACTIVITY_KEY) redirect("/dashboard");

  await ensureCustomOrdersFlagRegistered();
  if (!(await isCustomOrdersModuleEnabled(user.businessId))) redirect("/dashboard");

  const [{ data: customers }, { data: technicians }, locations, currentLocation] = await Promise.all([
    supabase.from("customers").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    supabase.from("users").select("id, firstName:first_name, lastName:last_name").eq("business_id", user.businessId).eq("active", true).order("first_name", { ascending: true }),
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Nouvelle commande sur mesure</h1>
        <p className="text-sm text-zinc-500">Enregistrez la demande d&apos;un client pour une pièce fabriquée sur mesure.</p>
      </div>
      <CustomOrderForm
        customers={customers ?? []}
        technicians={(technicians ?? []).map((t) => ({ id: t.id as string, name: `${t.firstName} ${t.lastName}` }))}
        locations={locations}
        defaultLocationId={currentLocation?.id}
      />
    </div>
  );
}

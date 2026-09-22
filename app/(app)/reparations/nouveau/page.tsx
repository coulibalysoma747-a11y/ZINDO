import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { REPAIR_ACTIVITIES } from "@/lib/nav";
import { ensureRepairFlagRegistered, isRepairModuleEnabled } from "@/lib/actions/repairs";
import { supabase } from "@/lib/supabase";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { RepairTicketForm } from "./RepairTicketForm";

export default async function NewRepairTicketPage() {
  const user = await requirePermission(PERMISSIONS.REPAIRS_MANAGE);
  if (!user.business.activityKey || !REPAIR_ACTIVITIES.includes(user.business.activityKey)) redirect("/dashboard");

  await ensureRepairFlagRegistered();
  if (!(await isRepairModuleEnabled(user.businessId))) redirect("/dashboard");

  const [{ data: customers }, { data: technicians }, locations, currentLocation] = await Promise.all([
    supabase.from("customers").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    supabase
      .from("users")
      .select("id, firstName:first_name, lastName:last_name")
      .eq("business_id", user.businessId)
      .eq("active", true)
      .order("first_name", { ascending: true }),
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Nouveau bon de réparation</h1>
        <p className="text-sm text-zinc-500">Enregistrez la prise en charge d&apos;un appareil ou d&apos;un engin.</p>
      </div>
      <RepairTicketForm
        customers={customers ?? []}
        technicians={(technicians ?? []).map((t) => ({ id: t.id as string, name: `${t.firstName} ${t.lastName}` }))}
        locations={locations}
        defaultLocationId={currentLocation?.id}
      />
    </div>
  );
}

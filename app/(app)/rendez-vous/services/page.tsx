import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { BEAUTY_ACTIVITY_KEY } from "@/lib/nav";
import { ensureAppointmentsFlagRegistered, isAppointmentsModuleEnabled, getServicesAction } from "@/lib/actions/appointments";
import { ServicesManager } from "./ServicesManager";

export default async function ServicesPage() {
  const user = await requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE);
  if (user.business.activityKey !== BEAUTY_ACTIVITY_KEY) redirect("/dashboard");

  await ensureAppointmentsFlagRegistered();
  if (!(await isAppointmentsModuleEnabled(user.businessId))) redirect("/dashboard");

  const services = await getServicesAction();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/rendez-vous" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;agenda
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-zinc-500" />
          <h1 className="text-xl font-bold text-zinc-900">Services & prestations</h1>
        </div>
        <p className="text-sm text-zinc-500">Le catalogue de prestations proposées, avec leur durée et leur prix par défaut.</p>
      </div>

      <ServicesManager services={services} currency={user.business.currency} />
    </div>
  );
}

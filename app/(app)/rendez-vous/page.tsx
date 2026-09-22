import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarCheck2, Sparkles } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { BEAUTY_ACTIVITY_KEY } from "@/lib/nav";
import { ensureAppointmentsFlagRegistered, isAppointmentsModuleEnabled, getAppointmentsAction, getServicesAction } from "@/lib/actions/appointments";
import { supabase } from "@/lib/supabase";
import { getCurrentLocation } from "@/lib/location";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { AppointmentsAgenda } from "./AppointmentsAgenda";

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requirePermission(PERMISSIONS.APPOINTMENTS_MANAGE);
  if (user.business.activityKey !== BEAUTY_ACTIVITY_KEY) redirect("/dashboard");

  await ensureAppointmentsFlagRegistered();
  if (!(await isAppointmentsModuleEnabled(user.businessId))) redirect("/dashboard");

  const currentLocation = await getCurrentLocation(user.businessId);
  if (!currentLocation) {
    return (
      <EmptyState title="Aucune boutique configurée" description="Créez une boutique avant de gérer vos rendez-vous." action={<ButtonLink href="/boutiques">Configurer une boutique</ButtonLink>} />
    );
  }

  const { date } = await searchParams;
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : toIsoDate(new Date());
  const nextDay = toIsoDate(new Date(new Date(`${day}T00:00:00Z`).getTime() + 24 * 60 * 60_000));

  const [appointments, services, { data: customers }, { data: staff }] = await Promise.all([
    getAppointmentsAction(`${day}T00:00:00.000Z`, `${nextDay}T00:00:00.000Z`),
    getServicesAction(),
    supabase.from("customers").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    supabase.from("users").select("id, firstName:first_name, lastName:last_name").eq("business_id", user.businessId).eq("active", true).order("first_name", { ascending: true }),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Rendez-vous</h1>
            <p className="text-sm text-zinc-500">Agenda du salon — l&apos;encaissement de la prestation se fait normalement depuis l&apos;écran de vente.</p>
          </div>
        </div>
        <Link href="/rendez-vous/services" className="flex items-center gap-1 text-sm text-zindo-green-700 hover:underline">
          <Sparkles className="h-4 w-4" /> Gérer les prestations
        </Link>
      </div>

      <AppointmentsAgenda
        day={day}
        appointments={appointments}
        services={services.filter((s) => s.active)}
        customers={customers ?? []}
        staff={(staff ?? []).map((s) => ({ id: s.id as string, name: `${s.firstName} ${s.lastName}` }))}
        locationId={currentLocation.id}
        currency={user.business.currency}
      />
    </div>
  );
}

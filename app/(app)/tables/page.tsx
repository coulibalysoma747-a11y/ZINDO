import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { TABLE_ACTIVITIES } from "@/lib/nav";
import { ensureTablesFlagRegistered, isTablesModuleEnabled, getTablesAction } from "@/lib/actions/tables";
import { supabase } from "@/lib/supabase";
import { getCurrentLocation } from "@/lib/location";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { TablesBoard } from "./TablesBoard";

export default async function TablesPage() {
  const user = await requirePermission(PERMISSIONS.TABLES_MANAGE);
  if (!user.business.activityKey || !TABLE_ACTIVITIES.includes(user.business.activityKey)) redirect("/dashboard");

  await ensureTablesFlagRegistered();
  if (!(await isTablesModuleEnabled(user.businessId))) redirect("/dashboard");

  const currentLocation = await getCurrentLocation(user.businessId);
  if (!currentLocation) {
    return (
      <EmptyState
        title="Aucune boutique configurée"
        description="Créez une boutique avant de gérer vos tables."
        action={<ButtonLink href="/boutiques">Configurer une boutique</ButtonLink>}
      />
    );
  }

  const [tables, { data: customers }] = await Promise.all([
    getTablesAction(currentLocation.id),
    supabase.from("customers").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Tables</h1>
        <p className="text-sm text-zinc-500">
          Ouvrez un compte à l&apos;arrivée du client, ajoutez ses commandes au fil du service, puis encaissez en une fois au départ.
        </p>
      </div>

      <TablesBoard
        locationId={currentLocation.id}
        tables={tables}
        customers={customers ?? []}
        currency={user.business.currency}
      />
    </div>
  );
}

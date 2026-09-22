import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/Empty";
import { CreateFeatureFlagForm } from "./CreateFeatureFlagForm";
import { FeatureFlagCard } from "./FeatureFlagCard";

type FlagRow = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabledGlobally: boolean;
};

export default async function AdminFeatureFlagsPage() {
  await requireSuperAdmin();

  const [{ data: flagsData }, { data: overridesData }, { data: locationOverridesData }, { data: businesses }, { data: locations }] =
    await Promise.all([
      supabase
        .from("feature_flags")
        .select("id, key, label, description, enabledGlobally:enabled_globally")
        .order("created_at", { ascending: false }),
      supabase.from("feature_flag_businesses").select("id, featureFlagId:feature_flag_id, businessId:business_id, enabled"),
      supabase
        .from("feature_flag_locations")
        .select("id, featureFlagId:feature_flag_id, locationId:location_id, enabled"),
      supabase.from("businesses").select("id, name").order("name", { ascending: true }),
      supabase.from("locations").select("id, businessId:business_id, name, type").order("name", { ascending: true }),
    ]);
  const flags = (flagsData ?? []) as unknown as FlagRow[];
  const overrides = (overridesData ?? []) as unknown as Array<{ featureFlagId: string; businessId: string; enabled: boolean }>;
  const locationOverrides = (locationOverridesData ?? []) as unknown as Array<{
    featureFlagId: string;
    locationId: string;
    enabled: boolean;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Fonctionnalités</h1>
          <p className="max-w-2xl text-sm text-zinc-500">
            Déploiement progressif : une fonctionnalité enregistrée ici reste invisible pour tous les
            commerçants jusqu&apos;à ce que vous l&apos;activiez — globalement, pour des commerces choisis, ou
            même pour une seule boutique d&apos;un commerce qui en a plusieurs.
          </p>
        </div>
        <CreateFeatureFlagForm />
      </div>

      {flags.length === 0 ? (
        <EmptyState
          title="Aucune fonctionnalité en cours de déploiement"
          description="Les fonctionnalités déjà disponibles pour tous ne sont pas listées ici — seules celles en test progressif apparaissent."
        />
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <FeatureFlagCard
              key={flag.id}
              flag={flag}
              businesses={businesses ?? []}
              locations={locations ?? []}
              overrides={overrides
                .filter((o) => o.featureFlagId === flag.id)
                .map((o) => ({ businessId: o.businessId, enabled: o.enabled }))}
              locationOverrides={locationOverrides
                .filter((o) => o.featureFlagId === flag.id)
                .map((o) => ({ locationId: o.locationId, enabled: o.enabled }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

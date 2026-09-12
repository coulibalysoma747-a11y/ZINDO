import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/Empty";
import { CreateFeatureFlagForm } from "./CreateFeatureFlagForm";
import { FeatureFlagCard } from "./FeatureFlagCard";

export default async function AdminFeatureFlagsPage() {
  await requireSuperAdmin();

  const [flags, businesses] = await Promise.all([
    prisma.featureFlag.findMany({
      include: { overrides: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.business.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Fonctionnalités</h1>
          <p className="max-w-2xl text-sm text-zinc-500">
            Déploiement progressif : une fonctionnalité enregistrée ici reste invisible pour tous les
            commerçants jusqu&apos;à ce que vous l&apos;activiez — globalement, ou pour des commerces choisis.
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
              businesses={businesses}
              overrides={flag.overrides.map((o) => ({ businessId: o.businessId, enabled: o.enabled }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

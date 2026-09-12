import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { prisma } from "@/lib/prisma";
import { FEATURE_CATALOG } from "@/lib/subscription";
import { PlanEditForm } from "./PlanEditForm";

export default async function AdminPlansPage() {
  await requireSuperAdmin();

  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/abonnements" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux abonnements
      </Link>

      <div>
        <h1 className="text-xl font-bold text-zinc-900">Paliers d&apos;abonnement</h1>
        <p className="max-w-2xl text-sm text-zinc-500">
          Les fonctionnalités marquées « appliquée » sont réellement contrôlées dans l&apos;application
          (module masqué si absent du palier). Les autres sont affichées à titre indicatif sur la grille
          tarifaire uniquement.
        </p>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <PlanEditForm
            key={plan.id}
            plan={{
              id: plan.id,
              key: plan.key,
              label: plan.label,
              monthlyPrice: plan.monthlyPrice,
              annualPrice: plan.annualPrice,
              maxProducts: plan.maxProducts,
              maxUsers: plan.maxUsers,
              maxLocations: plan.maxLocations,
              features: JSON.parse(plan.features) as string[],
            }}
            featureCatalog={FEATURE_CATALOG}
          />
        ))}
      </div>
    </div>
  );
}

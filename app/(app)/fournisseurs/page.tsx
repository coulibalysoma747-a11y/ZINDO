import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getActivityConfig, resolveTerm } from "@/lib/activity-config";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { SupplierManager } from "./SupplierManager";

export default async function SuppliersPage() {
  const user = await requirePermission(PERMISSIONS.SUPPLIERS_MANAGE);

  const [suppliers, activityConfig] = await Promise.all([
    prisma.supplier.findMany({
      where: { businessId: user.businessId },
      orderBy: { name: "asc" },
    }),
    getActivityConfig(user.business.activityKey),
  ]);
  const suppliersLabel = resolveTerm(activityConfig, "suppliers");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{suppliersLabel}</h1>
          <p className="text-sm text-zinc-500">{suppliers.length} {suppliersLabel.toLowerCase()}</p>
        </div>
        <SupplierManager mode="create-only" />
      </div>

      {suppliers.length === 0 ? (
        <EmptyState title="Aucun fournisseur" description="Ajoutez votre premier fournisseur." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Entreprise</th>
                <th className="px-4 py-3 font-medium">Téléphone</th>
                <th className="px-4 py-3 font-medium">Adresse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/fournisseurs/${s.id}`} className="font-medium text-zinc-900 hover:text-emerald-600">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{s.company ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.address ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

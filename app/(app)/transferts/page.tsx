import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";

export default async function TransfersPage() {
  const user = await requirePermission(PERMISSIONS.TRANSFERS_MANAGE);

  const transfers = await prisma.stockTransfer.findMany({
    where: { businessId: user.businessId },
    include: { fromLocation: true, toLocation: true, user: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Transferts de marchandises</h1>
          <p className="text-sm text-zinc-500">
            {transfers.length} transfert(s) entre boutiques et dépôts
          </p>
        </div>
        <ButtonLink href="/transferts/nouveau">
          <Plus className="h-4 w-4" /> Nouveau transfert
        </ButtonLink>
      </div>

      {transfers.length === 0 ? (
        <EmptyState
          title="Aucun transfert enregistré"
          description="Déplacez de la marchandise entre votre dépôt et vos boutiques."
          action={
            <ButtonLink href="/transferts/nouveau">
              <Plus className="h-4 w-4" /> Nouveau transfert
            </ButtonLink>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Trajet</th>
                <th className="px-4 py-3 font-medium">Produits</th>
                <th className="px-4 py-3 font-medium">Par</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {transfers.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/transferts/${t.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                      {t.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{formatDateTime(t.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-zinc-700">
                      {t.fromLocation.name} <ArrowRight className="h-3.5 w-3.5 text-zinc-400" /> {t.toLocation.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{t._count.items} référence(s)</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {t.user.firstName} {t.user.lastName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

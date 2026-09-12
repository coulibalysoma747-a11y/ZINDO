import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";

export default async function InventoryListPage() {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE);

  const inventories = await prisma.inventory.findMany({
    where: { businessId: user.businessId },
    include: { user: true, location: true, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Inventaire</h1>
          <p className="text-sm text-zinc-500">Comparez le stock théorique au stock réel.</p>
        </div>
        <ButtonLink href="/inventaire/nouveau">
          <Plus className="h-4 w-4" /> Nouvel inventaire
        </ButtonLink>
      </div>

      {inventories.length === 0 ? (
        <EmptyState title="Aucun inventaire" description="Lancez votre premier comptage de stock." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Référence</th>
                <th className="px-4 py-3 font-medium">Boutique</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Produits comptés</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {inventories.map((inv) => (
                <tr key={inv.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/inventaire/${inv.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                      {inv.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{inv.location.name}</td>
                  <td className="px-4 py-3 text-zinc-600">{formatDateTime(inv.createdAt)}</td>
                  <td className="px-4 py-3 text-zinc-600">{inv._count.items}</td>
                  <td className="px-4 py-3">
                    <Badge tone={inv.status === "VALIDE" ? "emerald" : "amber"}>{inv.status}</Badge>
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

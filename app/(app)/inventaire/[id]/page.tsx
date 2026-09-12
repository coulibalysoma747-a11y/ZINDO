import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ValidateInventoryButton } from "./ValidateInventoryButton";

export default async function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE);
  const { id } = await params;

  const inventory = await prisma.inventory.findFirst({
    where: { id, businessId: user.businessId },
    include: { items: { include: { product: true } }, user: true, location: true },
  });
  if (!inventory) notFound();

  const discrepancies = inventory.items.filter((i) => i.difference !== 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/inventaire" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="h-4 w-4" /> Retour à l&apos;inventaire
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-xl font-bold text-zinc-900">{inventory.reference}</h1>
            <Badge tone={inventory.status === "VALIDE" ? "emerald" : "amber"}>{inventory.status}</Badge>
          </div>
          <p className="text-sm text-zinc-500">
            {inventory.location.name} · {formatDateTime(inventory.createdAt)} · par {inventory.user.firstName}{" "}
            {inventory.user.lastName}
          </p>
        </div>
        {inventory.status === "EN_COURS" && (
          <ValidateInventoryButton inventoryId={inventory.id} discrepancyCount={discrepancies.length} />
        )}
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Comptage</h2>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Produit</th>
                <th className="px-4 py-2 text-right font-medium">Stock théorique</th>
                <th className="px-4 py-2 text-right font-medium">Stock réel</th>
                <th className="px-4 py-2 text-right font-medium">Écart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {inventory.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 font-medium text-zinc-900">{item.product.name}</td>
                  <td className="px-4 py-2 text-right text-zinc-700">{item.theoreticalQty}</td>
                  <td className="px-4 py-2 text-right text-zinc-700">{item.realQty}</td>
                  <td
                    className={`px-4 py-2 text-right font-medium ${
                      item.difference === 0
                        ? "text-zinc-400"
                        : item.difference > 0
                          ? "text-emerald-600"
                          : "text-red-600"
                    }`}
                  >
                    {item.difference > 0 ? `+${item.difference}` : item.difference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

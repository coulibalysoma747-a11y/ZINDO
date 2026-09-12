import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";

export default async function AdminBusinessesPage() {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, sales: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Commerçants</h1>
        <p className="text-sm text-zinc-500">{businesses.length} commerce(s) enregistré(s) sur la plateforme</p>
      </div>

      {businesses.length === 0 ? (
        <EmptyState title="Aucun commerçant" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Activité</th>
                <th className="px-4 py-3 font-medium">Utilisateurs</th>
                <th className="px-4 py-3 font-medium">Ventes</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Créé le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {businesses.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/commercants/${b.id}`} className="font-medium text-zindo-orange-600 hover:underline">
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{b.activity ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{b._count.users}</td>
                  <td className="px-4 py-3 text-zinc-600">{b._count.sales}</td>
                  <td className="px-4 py-3 text-zinc-600">{b.plan}</td>
                  <td className="px-4 py-3">
                    {b.suspended ? <Badge tone="red">Suspendu</Badge> : <Badge tone="emerald">Actif</Badge>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{formatDateTime(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

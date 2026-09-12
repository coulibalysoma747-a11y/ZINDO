import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { UserActiveToggle } from "./UserActiveToggle";
import { UserRoleSelect } from "./UserRoleSelect";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { business: true },
    take: 500,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Utilisateurs</h1>
        <p className="text-sm text-zinc-500">{users.length} utilisateur(s) sur l&apos;ensemble des commerçants</p>
      </div>

      {users.length === 0 ? (
        <EmptyState title="Aucun utilisateur" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Commerce</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {u.phone}
                    {u.email ? ` — ${u.email}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/commercants/${u.businessId}`} className="text-zindo-orange-600 hover:underline">
                      {u.business.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <UserRoleSelect userId={u.id} role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    {u.active ? <Badge tone="emerald">Actif</Badge> : <Badge tone="zinc">Désactivé</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <UserActiveToggle userId={u.id} active={u.active} />
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

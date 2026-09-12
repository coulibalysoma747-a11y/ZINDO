import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, ROLE_LABELS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { UserManager } from "./UserManager";
import { UserRowActions } from "./UserRowActions";

export default async function UsersPage() {
  const admin = await requirePermission(PERMISSIONS.USERS_MANAGE);

  const users = await prisma.user.findMany({
    where: { businessId: admin.businessId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Utilisateurs</h1>
          <p className="text-sm text-zinc-500">{users.length} compte(s) sur {admin.business.name}</p>
        </div>
        <UserManager />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((u) => (
              <UserRow key={u.id} user={u} isSelf={u.id === admin.id} />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function UserRow({
  user,
  isSelf,
}: {
  user: { id: string; firstName: string; lastName: string; phone: string; role: keyof typeof ROLE_LABELS; active: boolean };
  isSelf: boolean;
}) {
  return (
    <tr className="hover:bg-zinc-50">
      <td className="px-4 py-3 font-medium text-zinc-900">
        {user.firstName} {user.lastName} {isSelf && <span className="text-xs text-zinc-400">(vous)</span>}
      </td>
      <td className="px-4 py-3 text-zinc-600">{user.phone}</td>
      <td className="px-4 py-3">
        <Badge tone="blue">{ROLE_LABELS[user.role]}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge tone={user.active ? "emerald" : "zinc"}>{user.active ? "Actif" : "Désactivé"}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        {!isSelf && (
          <UserRowActions
            userId={user.id}
            userName={`${user.firstName} ${user.lastName}`}
            active={user.active}
          />
        )}
      </td>
    </tr>
  );
}

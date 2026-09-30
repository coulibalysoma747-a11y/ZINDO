import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, ROLE_LABELS, roleLabels } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { UserManager } from "./UserManager";
import { UserRowActions } from "./UserRowActions";
import { EditUserButton } from "./EditUserButton";
import { isExtendedEditEnabled } from "@/lib/extended-edit";

export default async function UsersPage() {
  const admin = await requirePermission(PERMISSIONS.USERS_MANAGE);

  const { data } = await supabase
    .from("users")
    .select("id, firstName:first_name, lastName:last_name, phone, role, active")
    .eq("business_id", admin.businessId)
    .order("created_at", { ascending: true });
  const extendedEdit = await isExtendedEditEnabled(admin.businessId);
  const users = (data ?? []) as unknown as Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: keyof typeof ROLE_LABELS;
    active: boolean;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Utilisateurs</h1>
          <p className="text-sm text-zinc-500">
            {users.length} compte(s) sur {admin.business.name}
          </p>
        </div>
        <UserManager labels={roleLabels(admin.business.activityKey)} />
      </div>

      <Card className="overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHead>
            <TableRow interactive={false}>
              <TableHeaderCell>Nom</TableHeaderCell>
              <TableHeaderCell>Téléphone</TableHeaderCell>
              <TableHeaderCell>Rôle</TableHeaderCell>
              <TableHeaderCell>Statut</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <UserRow key={u.id} labels={roleLabels(admin.business.activityKey)} user={u} isSelf={u.id === admin.id} canEdit={extendedEdit} />
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function UserRow({
  labels,
  user,
  isSelf,
  canEdit,
}: {
  user: { id: string; firstName: string; lastName: string; phone: string; role: keyof typeof ROLE_LABELS; active: boolean };
  isSelf: boolean;
  labels: Record<string, string>;
  canEdit: boolean;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium text-zinc-900 dark:text-slate-100">
        {user.firstName} {user.lastName} {isSelf && <span className="text-xs text-zinc-400">(vous)</span>}
      </TableCell>
      <TableCell className="text-zinc-600 dark:text-slate-400">{user.phone}</TableCell>
      <TableCell>
        <Badge tone="blue">{labels[user.role]}</Badge>
      </TableCell>
      <TableCell>
        <Badge tone={user.active ? "emerald" : "zinc"}>{user.active ? "Actif" : "Désactivé"}</Badge>
      </TableCell>
      <TableCell align="right">
        <div className="flex items-center justify-end gap-2">
          {canEdit && <EditUserButton user={user} />}
          {!isSelf && <UserRowActions labels={labels} userId={user.id} userName={`${user.firstName} ${user.lastName}`} active={user.active} />}
        </div>
      </TableCell>
    </TableRow>
  );
}

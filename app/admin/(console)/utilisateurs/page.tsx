import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { UserActiveToggle } from "./UserActiveToggle";
import { UserRoleSelect } from "./UserRoleSelect";

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: "ADMIN" | "VENDEUR" | "GESTIONNAIRE_STOCK";
  active: boolean;
  businessId: string;
  business: { name: string };
};

export default async function AdminUsersPage() {
  const { data } = await supabase
    .from("users")
    .select(
      "id, firstName:first_name, lastName:last_name, phone, email, role, active, businessId:business_id, business:businesses(name)"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  const users = (data ?? []) as unknown as UserRow[];

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
                    <Link href={`/admin/commercants/${u.businessId}`} className="text-zindo-green-600 hover:underline">
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

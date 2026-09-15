import { Crown, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requireFounder } from "@/lib/superadmin-auth";
import { formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { CreateAdminForm } from "./CreateAdminForm";
import { DeleteAdminButton } from "./DeleteAdminButton";

type AdminRow = {
  id: string;
  name: string;
  email: string;
  role: "FOUNDER" | "ADMIN";
  createdAt: string;
};

export default async function AdminAccountsPage() {
  const founder = await requireFounder();

  const { data } = await supabase
    .from("super_admins")
    .select("id, name, email, role, createdAt:created_at")
    .order("created_at", { ascending: true });
  const admins = (data ?? []) as unknown as AdminRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Administrateurs</h1>
          <p className="text-sm text-zinc-500">
            Comptes ayant accès à la console ZINDO. Seul le compte fondateur peut en créer ou en supprimer.
          </p>
        </div>
        <CreateAdminForm />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Créé le</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {admins.map((a) => (
              <tr key={a.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 text-zinc-900">
                  <div className="flex items-center gap-2">
                    {a.role === "FOUNDER" ? (
                      <Crown className="h-4 w-4 text-amber-500" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-zindo-green-400" />
                    )}
                    {a.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600">{a.email}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {a.role === "FOUNDER" ? "Créateur • Fondateur • Propriétaire" : "Administrateur"}
                </td>
                <td className="px-4 py-3 text-zinc-600">{formatDateTime(new Date(a.createdAt))}</td>
                <td className="px-4 py-3 text-right">
                  {a.role !== "FOUNDER" && a.id !== founder.id && (
                    <DeleteAdminButton adminId={a.id} adminName={a.name} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

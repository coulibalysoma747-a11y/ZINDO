import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";

type BusinessRow = {
  id: string;
  name: string;
  activity: string | null;
  plan: string;
  suspended: boolean;
  createdAt: string;
};

export default async function AdminBusinessesPage() {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, activity, plan, suspended, createdAt:created_at")
    .order("created_at", { ascending: false });
  const businesses = (data ?? []) as unknown as BusinessRow[];

  const businessIds = businesses.map((b) => b.id);
  const [{ data: users }, { data: sales }] = await Promise.all([
    businessIds.length
      ? supabase.from("users").select("id, businessId:business_id").in("business_id", businessIds)
      : Promise.resolve({ data: [] as { id: string; businessId: string }[] }),
    businessIds.length
      ? supabase.from("sales").select("id, businessId:business_id").in("business_id", businessIds)
      : Promise.resolve({ data: [] as { id: string; businessId: string }[] }),
  ]);
  const userCounts = new Map<string, number>();
  for (const u of (users ?? []) as Array<{ businessId: string }>) userCounts.set(u.businessId, (userCounts.get(u.businessId) ?? 0) + 1);
  const saleCounts = new Map<string, number>();
  for (const s of (sales ?? []) as Array<{ businessId: string }>) saleCounts.set(s.businessId, (saleCounts.get(s.businessId) ?? 0) + 1);

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
                    <Link href={`/admin/commercants/${b.id}`} className="font-medium text-zindo-green-600 hover:underline">
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{b.activity ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{userCounts.get(b.id) ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-600">{saleCounts.get(b.id) ?? 0}</td>
                  <td className="px-4 py-3 text-zinc-600">{b.plan}</td>
                  <td className="px-4 py-3">
                    {b.suspended ? <Badge tone="red">Suspendu</Badge> : <Badge tone="emerald">Actif</Badge>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{formatDateTime(new Date(b.createdAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

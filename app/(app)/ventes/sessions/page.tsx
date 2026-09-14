import Link from "next/link";
import { Eye, Lock } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";

type SessionRow = {
  id: string;
  number: string;
  openedAt: string;
  closedAt: string | null;
  status: string;
  totalRevenue: number | null;
  variance: number | null;
  location: { name: string };
  user: { firstName: string; lastName: string };
};

export default async function CashSessionsPage() {
  const user = await requirePermission(PERMISSIONS.CASH_SESSIONS_MANAGE);

  const { data } = await supabase
    .from("cash_sessions")
    .select(
      "id, number, openedAt:opened_at, closedAt:closed_at, status, totalRevenue:total_revenue, variance, location:locations(name), user:users(firstName:first_name, lastName:last_name)"
    )
    .eq("business_id", user.businessId)
    .order("opened_at", { ascending: false })
    .limit(200);
  const sessions = (data ?? []) as unknown as SessionRow[];

  const currency = user.business.currency;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Sessions de caisse</h1>
        <p className="text-sm text-zinc-500">{sessions.length} session(s)</p>
      </div>

      {sessions.length === 0 ? (
        <EmptyState title="Aucune session de caisse" description="Ouvrez une session depuis la page Vente / Caisse." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Boutique</th>
                <th className="px-4 py-3 font-medium">Caissier</th>
                <th className="px-4 py-3 font-medium">Ouverture</th>
                <th className="px-4 py-3 font-medium">Clôture</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">CA</th>
                <th className="px-4 py-3 text-right font-medium">Écart</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">{s.number}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.location.name}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {s.user.firstName} {s.user.lastName}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{formatDateTime(new Date(s.openedAt))}</td>
                  <td className="px-4 py-3 text-zinc-600">{s.closedAt ? formatDateTime(new Date(s.closedAt)) : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={s.status === "OUVERTE" ? "amber" : "zinc"}>
                      {s.status === "OUVERTE" ? "Ouverte" : "Fermée"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">
                    {s.totalRevenue != null ? formatMoney(s.totalRevenue, currency) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.variance != null ? (
                      <span
                        className={
                          s.variance === 0 ? "text-zinc-500" : s.variance > 0 ? "text-emerald-600" : "text-red-600"
                        }
                      >
                        {s.variance > 0 ? "+" : ""}
                        {formatMoney(s.variance, currency)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === "OUVERTE" ? (
                      <Link
                        href={`/ventes/session/${s.id}/fermer`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        <Lock className="h-3.5 w-3.5" /> Fermer
                      </Link>
                    ) : (
                      <Link
                        href={`/ventes/session/${s.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Eye className="h-3.5 w-3.5" /> Voir le ticket
                      </Link>
                    )}
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

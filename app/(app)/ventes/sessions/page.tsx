import Link from "next/link";
import { Eye, Lock } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

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
          <Table className="min-w-[800px]">
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>N°</TableHeaderCell>
                <TableHeaderCell>Boutique</TableHeaderCell>
                <TableHeaderCell>Caissier</TableHeaderCell>
                <TableHeaderCell>Ouverture</TableHeaderCell>
                <TableHeaderCell>Clôture</TableHeaderCell>
                <TableHeaderCell>Statut</TableHeaderCell>
                <TableHeaderCell align="right">CA</TableHeaderCell>
                <TableHeaderCell align="right">Écart</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs text-zinc-700 dark:text-slate-300">{s.number}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{s.location.name}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">
                    {s.user.firstName} {s.user.lastName}
                  </TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{formatDateTime(new Date(s.openedAt))}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">
                    {s.closedAt ? formatDateTime(new Date(s.closedAt)) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge tone={s.status === "OUVERTE" ? "amber" : "zinc"}>
                      {s.status === "OUVERTE" ? "Ouverte" : "Fermée"}
                    </Badge>
                  </TableCell>
                  <TableCell align="right" className="font-medium tabular-nums text-zinc-900 dark:text-slate-100">
                    {s.totalRevenue != null ? formatMoney(s.totalRevenue, currency) : "—"}
                  </TableCell>
                  <TableCell align="right" className="tabular-nums">
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
                  </TableCell>
                  <TableCell align="right">
                    {s.status === "OUVERTE" ? (
                      <Link
                        href={`/ventes/session/${s.id}/fermer`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                      >
                        <Lock className="h-3.5 w-3.5" /> Fermer
                      </Link>
                    ) : (
                      <Link
                        href={`/ventes/session/${s.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-emerald-900/30"
                      >
                        <Eye className="h-3.5 w-3.5" /> Voir le ticket
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

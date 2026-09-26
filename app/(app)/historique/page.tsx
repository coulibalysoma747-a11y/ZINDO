import { FileText } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { loadGlobalHistory } from "@/lib/global-history";
import { formatMoney, formatDateTime, startOfToday, startOfYesterday, startOfWeek, startOfMonth } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { isDocumentEnabled } from "@/lib/documents";
import { ButtonLink } from "@/components/ui/Button";
import { HistoryFilters } from "@/components/history/HistoryFilters";
import { TypeFilter } from "@/components/history/TypeFilter";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

export default async function GlobalHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; type?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.REPORTS_VIEW);
  const { periode, type } = await searchParams;
  const currency = user.business.currency;

  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;
  if (periode === "aujourdhui") dateFrom = startOfToday();
  else if (periode === "hier") {
    dateFrom = startOfYesterday();
    dateTo = startOfToday();
  } else if (periode === "semaine") dateFrom = startOfWeek();
  else if (periode === "mois") dateFrom = startOfMonth();

  const [{ rows }, journalPdf] = await Promise.all([
    loadGlobalHistory(user.businessId, { dateFrom, dateTo, type }),
    isDocumentEnabled("pdf_journal", user.businessId),
  ]);
  const journalQuery = new URLSearchParams({ ...(periode ? { periode } : {}), ...(type ? { type } : {}) }).toString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Historique global</h1>
        <p className="text-sm text-zinc-500">Toutes les opérations enregistrées dans ZINDO.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <HistoryFilters paramName="periode" />
        <div className="flex flex-wrap items-center gap-2">
          <TypeFilter />
          {journalPdf && (
            <ButtonLink href={journalQuery ? `/historique/document?${journalQuery}` : "/historique/document"} variant="outline">
              <FileText className="h-4 w-4" /> Journal PDF
            </ButtonLink>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucune opération sur cette période" />
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Boutique</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Détail</TableHeaderCell>
                <TableHeaderCell align="right">Montant / Qté</TableHeaderCell>
                <TableHeaderCell>Utilisateur</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{formatDateTime(r.date)}</TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{r.location}</TableCell>
                  <TableCell>
                    <Badge tone={r.tone}>{r.type}</Badge>
                  </TableCell>
                  <TableCell className="text-zinc-900 dark:text-slate-100">{r.description}</TableCell>
                  <TableCell align="right" className="font-medium text-zinc-900 tabular-nums dark:text-slate-100">
                    {r.type === "Entrée" || r.type === "Sortie" ? r.amount : formatMoney(r.amount, currency)}
                  </TableCell>
                  <TableCell className="text-zinc-600 dark:text-slate-400">{r.user}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

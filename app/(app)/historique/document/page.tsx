import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { formatDateTime, formatMoney } from "@/lib/format";
import { loadGlobalHistory, TYPE_TO_FILTER } from "@/lib/global-history";
import { isDocumentEnabled, loadDocBusiness, printedByName, resolvePeriod } from "@/lib/documents";
import { isZindoMentionEnabled } from "@/lib/zindo-mention";
import { A4Document, DocSection, DocTable } from "@/components/documents/A4Document";
import { DocChips, DocToolbar, PeriodPicker } from "@/components/documents/DocToolbar";

const TYPE_LABELS: Record<string, string> = {
  "": "Tout",
  ventes: "Ventes",
  achats: "Achats",
  entrees: "Entrées",
  sorties: "Sorties",
  credits: "Crédits remboursés",
  paiements: "Paiements",
};

// Plafond du document : au-delà, mieux vaut réduire la période.
const MAX_ROWS = 2000;

/** Journal des opérations A4 (flag « pdf_journal ») : mêmes opérations que l'écran Historique. */
export default async function JournalDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; du?: string; au?: string; type?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.REPORTS_VIEW);
  if (!(await isDocumentEnabled("pdf_journal", user.businessId))) notFound();
  const sp = await searchParams;
  const type = sp.type && TYPE_TO_FILTER[sp.type] ? sp.type : undefined;
  const period = resolvePeriod(sp);

  const [business, zindoMention, { rows, truncated }] = await Promise.all([
    loadDocBusiness(user.businessId),
    isZindoMentionEnabled(user.businessId),
    loadGlobalHistory(user.businessId, {
      dateFrom: period.from,
      dateTo: period.to,
      type,
      limitPerSource: 1000,
      maxRows: MAX_ROWS,
      readableReasons: true,
    }),
  ]);
  if (!business) notFound();

  const money = (v: number) => formatMoney(v, business.currency);
  const sum = (t: string) => rows.filter((r) => r.type === t).reduce((s, r) => s + r.amount, 0);
  const typeHref = (t: string) => {
    const q = new URLSearchParams(period.query);
    if (t) q.set("type", t);
    const s = q.toString();
    return s ? `/historique/document?${s}` : "/historique/document";
  };

  return (
    <div>
      <DocToolbar backHref="/historique" backLabel="Retour à l'historique">
        <PeriodPicker basePath="/historique/document" current={sp} extra={{ type }} />
        <DocChips items={Object.entries(TYPE_LABELS).map(([k, l]) => ({ label: l, href: typeHref(k), active: (type ?? "") === k }))} />
      </DocToolbar>
      <A4Document
        business={business}
        title="JOURNAL DES OPÉRATIONS"
        meta={[period.label, `Opérations : ${TYPE_LABELS[type ?? ""]}`]}
        stats={[
          { label: "Opérations", value: String(rows.length) },
          { label: "Ventes", value: money(sum("Vente")) },
          { label: "Achats", value: money(sum("Achat")) },
          { label: "Crédits remboursés", value: money(sum("Crédit remboursé")) },
        ]}
        printedAt={new Date()}
        printedBy={printedByName(user)}
        zindoMention={zindoMention}
      >
        {truncated && (
          <p className="mt-4 rounded-lg border border-zinc-900 p-2 text-xs font-semibold">
            Attention : trop d&apos;opérations sur cette période, seules les plus récentes figurent dans ce journal. Choisissez une
            période plus courte pour tout avoir.
          </p>
        )}
        <DocSection title="Opérations">
          <DocTable
            empty="Aucune opération sur cette période."
            columns={[
              { label: "Date" },
              { label: "Boutique" },
              { label: "Type" },
              { label: "Détail" },
              { label: "Montant / Qté", align: "right" },
              { label: "Utilisateur" },
            ]}
            rows={rows.map((r) => ({
              cells: [
                formatDateTime(r.date),
                r.location,
                r.type,
                r.description,
                r.type === "Entrée" || r.type === "Sortie" ? `${r.type === "Entrée" ? "+" : "−"}${r.amount}` : money(r.amount),
                r.user,
              ],
            }))}
          />
        </DocSection>
      </A4Document>
    </div>
  );
}

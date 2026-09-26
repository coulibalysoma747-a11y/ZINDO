import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabase-paging";
import { getCurrentLocation } from "@/lib/location";
import { formatDate, formatMoney } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-method-labels";
import { isDocumentEnabled, loadDocBusiness, printedByName, resolvePeriod } from "@/lib/documents";
import { isZindoMentionEnabled } from "@/lib/zindo-mention";
import { A4Document, DocSection, DocTable, type DocRow } from "@/components/documents/A4Document";
import { DocToolbar, PeriodPicker } from "@/components/documents/DocToolbar";

type ExpenseRow = {
  id: string;
  date: string;
  label: string;
  note: string | null;
  category: string | null;
  paymentMethod: string;
  amount: number;
  user: { firstName: string; lastName: string } | null;
};

/** État des dépenses A4 (flag « pdf_depenses ») de la boutique courante, par catégorie. */
export default async function ExpensesDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; du?: string; au?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.EXPENSES_MANAGE);
  if (!(await isDocumentEnabled("pdf_depenses", user.businessId))) notFound();
  const sp = await searchParams;
  const period = resolvePeriod(sp);

  const [business, zindoMention, location] = await Promise.all([
    loadDocBusiness(user.businessId),
    isZindoMentionEnabled(user.businessId),
    getCurrentLocation(user.businessId),
  ]);
  if (!business || !location) notFound();

  const expenses = await fetchAllPages<ExpenseRow>((from, to) => {
    let q = supabase
      .from("expenses")
      .select("id, date, label, note, category, paymentMethod:payment_method, amount, user:users(firstName:first_name, lastName:last_name)")
      .eq("business_id", user.businessId)
      .eq("location_id", location.id);
    if (period.from) q = q.gte("date", period.from.toISOString());
    if (period.to) q = q.lt("date", period.to.toISOString());
    return q.order("id", { ascending: true }).range(from, to) as unknown as PromiseLike<{
      data: ExpenseRow[] | null;
      error: { message: string } | null;
    }>;
  });

  const money = (v: number) => formatMoney(v, business.currency);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = new Map<string, ExpenseRow[]>();
  for (const e of expenses) {
    const c = e.category ?? "Sans catégorie";
    byCategory.set(c, [...(byCategory.get(c) ?? []), e]);
  }
  const categories = [...byCategory.entries()]
    .map(([name, list]) => ({ name, list: list.sort((a, b) => a.date.localeCompare(b.date)), total: list.reduce((s, e) => s + e.amount, 0) }))
    .sort((a, b) => b.total - a.total);

  const rows: DocRow[] = [];
  for (const c of categories) {
    rows.push({ group: c.name, key: `g-${c.name}` });
    for (const e of c.list) {
      rows.push({
        key: e.id,
        cells: [
          formatDate(new Date(e.date)),
          <span key="l">
            {e.label}
            {e.note && <span className="text-zinc-500"> — {e.note}</span>}
          </span>,
          PAYMENT_METHOD_LABELS[e.paymentMethod] ?? e.paymentMethod,
          e.user ? `${e.user.firstName} ${e.user.lastName}`.trim() : "—",
          money(e.amount),
        ],
      });
    }
    rows.push({ key: `t-${c.name}`, bold: true, cells: ["", `Total ${c.name}`, "", "", money(c.total)] });
  }
  if (categories.length) rows.push({ key: "total", bold: true, cells: ["", "TOTAL GÉNÉRAL", "", "", money(total)] });

  return (
    <div>
      <DocToolbar backHref="/depenses" backLabel="Retour aux dépenses">
        <PeriodPicker basePath="/depenses/document" current={sp} />
      </DocToolbar>
      <A4Document
        business={business}
        title="ÉTAT DES DÉPENSES"
        meta={[location.name, period.label]}
        stats={[
          { label: "Nombre de dépenses", value: String(expenses.length) },
          { label: "Catégories", value: String(categories.length) },
          { label: "Total des dépenses", value: money(total), strong: true },
        ]}
        printedAt={new Date()}
        printedBy={printedByName(user)}
        zindoMention={zindoMention}
        signatures={[{ label: "Visa du responsable", name: business.signerName }]}
      >
        <DocSection title="Détail par catégorie">
          <DocTable
            empty="Aucune dépense sur la période."
            columns={[{ label: "Date" }, { label: "Libellé" }, { label: "Règlement" }, { label: "Saisi par" }, { label: "Montant", align: "right" }]}
            rows={rows}
          />
        </DocSection>
      </A4Document>
    </div>
  );
}

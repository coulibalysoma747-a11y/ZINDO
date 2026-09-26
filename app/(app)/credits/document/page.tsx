import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabase-paging";
import { formatDate, formatMoney } from "@/lib/format";
import { isDocumentEnabled, loadDocBusiness, printedByName } from "@/lib/documents";
import { isZindoMentionEnabled } from "@/lib/zindo-mention";
import { A4Document, DocSection, DocTable } from "@/components/documents/A4Document";
import { DocChips, DocToolbar } from "@/components/documents/DocToolbar";

type SaleRow = {
  id: string;
  createdAt: string;
  total: number;
  amountPaid: number;
  customer: { id: string; name: string; phone: string | null } | null;
};

/** Liste des débiteurs (flag « pdf_liste_debiteurs ») : même calcul que la page Crédits. */
export default async function DebtorsDocumentPage({ searchParams }: { searchParams: Promise<{ tri?: string }> }) {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  if (!(await isDocumentEnabled("pdf_liste_debiteurs", user.businessId))) notFound();
  const { tri } = await searchParams;
  const byAge = tri === "anciennete";

  const [business, zindoMention, sales] = await Promise.all([
    loadDocBusiness(user.businessId),
    isZindoMentionEnabled(user.businessId),
    fetchAllPages<SaleRow>((from, to) =>
      supabase
        .from("sales")
        .select("id, createdAt:created_at, total, amountPaid:amount_paid, customer:customers(id, name, phone)")
        .eq("business_id", user.businessId)
        .in("status", ["CREDIT", "PARTIELLE"])
        .order("id", { ascending: true })
        .range(from, to) as unknown as PromiseLike<{ data: SaleRow[] | null; error: { message: string } | null }>
    ),
  ]);
  if (!business) notFound();

  const byCustomer = new Map<string, { name: string; phone: string | null; total: number; oldest: Date; count: number }>();
  for (const sale of sales) {
    if (!sale.customer) continue;
    const remaining = sale.total - sale.amountPaid;
    if (remaining <= 0) continue;
    const createdAt = new Date(sale.createdAt);
    const existing = byCustomer.get(sale.customer.id);
    if (existing) {
      existing.total += remaining;
      existing.count += 1;
      if (createdAt < existing.oldest) existing.oldest = createdAt;
    } else {
      byCustomer.set(sale.customer.id, { name: sale.customer.name, phone: sale.customer.phone, total: remaining, oldest: createdAt, count: 1 });
    }
  }
  const rows = [...byCustomer.values()].sort((a, b) => (byAge ? a.oldest.getTime() - b.oldest.getTime() : b.total - a.total));
  const total = rows.reduce((s, r) => s + r.total, 0);
  const now = new Date();
  const days = (d: Date) => Math.max(0, Math.floor((now.getTime() - d.getTime()) / (24 * 3600 * 1000)));
  const money = (v: number) => formatMoney(v, business.currency);

  return (
    <div>
      <DocToolbar backHref="/credits" backLabel="Retour aux crédits">
        <DocChips
          items={[
            { label: "Les plus grosses dettes d'abord", href: "/credits/document", active: !byAge },
            { label: "Les plus anciennes d'abord", href: "/credits/document?tri=anciennete", active: byAge },
          ]}
        />
      </DocToolbar>
      <A4Document
        business={business}
        title="LISTE DES DÉBITEURS"
        meta={[`Situation au ${formatDate(now)}`]}
        stats={[
          { label: "Clients débiteurs", value: String(rows.length) },
          { label: "Plus ancienne dette", value: rows.length ? `${Math.max(...rows.map((r) => days(r.oldest)))} jours` : "—" },
          { label: "Total dû", value: money(total), strong: true },
        ]}
        printedAt={now}
        printedBy={printedByName(user)}
        zindoMention={zindoMention}
      >
        <DocSection title="Clients">
          <DocTable
            empty="Aucun crédit en cours : tous les clients sont à jour."
            columns={[
              { label: "N°" },
              { label: "Client" },
              { label: "Téléphone" },
              { label: "Crédit depuis" },
              { label: "Ventes", align: "center" },
              { label: "Montant dû", align: "right" },
              { label: "Remarque (relance)", className: "w-[28%]" },
            ]}
            rows={[
              ...rows.map((r, i) => ({
                cells: [
                  i + 1,
                  <span key="n" className="font-semibold">{r.name}</span>,
                  r.phone ?? "—",
                  `${formatDate(r.oldest)} (${days(r.oldest)} j)`,
                  r.count,
                  <span key="m" className="font-bold">{money(r.total)}</span>,
                  "",
                ],
              })),
              ...(rows.length ? [{ cells: ["", "Total", "", "", "", money(total), ""], bold: true }] : []),
            ]}
          />
        </DocSection>
      </A4Document>
    </div>
  );
}

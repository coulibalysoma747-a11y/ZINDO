import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabase-paging";
import { getCurrentLocation } from "@/lib/location";
import { formatMoney } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-method-labels";
import { isDocumentEnabled, loadDocBusiness, printedByName, resolvePeriod, type Period } from "@/lib/documents";
import { isZindoMentionEnabled } from "@/lib/zindo-mention";
import { A4Document, DocSection, DocTable } from "@/components/documents/A4Document";
import { DocToolbar, PeriodPicker } from "@/components/documents/DocToolbar";

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;
type SaleRow = {
  id: string;
  total: number;
  paymentMethod: string;
  items: Array<{ productId: string; quantity: number; total: number; unitPrice: number; unitCost: number }>;
};
type PurchaseRow = { id: string; total: number; supplierId: string; supplier: { name: string } | null };
type ExpenseRow = { id: string; amount: number; category: string | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inPeriod(q: any, period: Period, column: string) {
  if (period.from) q = q.gte(column, period.from.toISOString());
  if (period.to) q = q.lt(column, period.to.toISOString());
  return q;
}

/**
 * Rapport d'activité A4 (flag « pdf_rapport_activite ») : mêmes calculs que
 * l'écran Rapports (lib/actions/reports.ts), avec le détail complet des
 * produits vendus, les encaissements par moyen de paiement et les dépenses.
 */
export default async function ActivityReportDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; du?: string; au?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.REPORTS_VIEW);
  if (!(await isDocumentEnabled("pdf_rapport_activite", user.businessId))) notFound();
  const sp = await searchParams;
  const period = resolvePeriod(sp);

  const [business, zindoMention, location] = await Promise.all([
    loadDocBusiness(user.businessId),
    isZindoMentionEnabled(user.businessId),
    getCurrentLocation(user.businessId),
  ]);
  if (!business || !location) notFound();

  const [sales, purchases, expenses] = await Promise.all([
    fetchAllPages<SaleRow>(
      (from, to) =>
        inPeriod(
          supabase
            .from("sales")
            .select("id, total, paymentMethod:payment_method, items:sale_items(productId:product_id, quantity, total, unitPrice:unit_price, unitCost:unit_cost)")
            .eq("business_id", user.businessId)
            .eq("location_id", location.id)
            .neq("status", "ANNULEE"),
          period,
          "created_at"
        )
          .order("id", { ascending: true })
          .range(from, to) as Page<SaleRow>
    ),
    fetchAllPages<PurchaseRow>(
      (from, to) =>
        inPeriod(
          supabase
            .from("purchases")
            .select("id, total, supplierId:supplier_id, supplier:suppliers(name)")
            .eq("business_id", user.businessId)
            .eq("location_id", location.id),
          period,
          "created_at"
        )
          .order("id", { ascending: true })
          .range(from, to) as Page<PurchaseRow>
    ),
    fetchAllPages<ExpenseRow>(
      (from, to) =>
        inPeriod(
          supabase.from("expenses").select("id, amount, category").eq("business_id", user.businessId).eq("location_id", location.id),
          period,
          "date"
        )
          .order("id", { ascending: true })
          .range(from, to) as Page<ExpenseRow>
    ),
  ]);

  // Ventes
  const revenue = sales.reduce((s, sale) => s + sale.total, 0);
  const byProduct = new Map<string, { quantity: number; total: number; profit: number }>();
  const byMethod = new Map<string, { count: number; total: number }>();
  for (const sale of sales) {
    const m = byMethod.get(sale.paymentMethod) ?? { count: 0, total: 0 };
    m.count += 1;
    m.total += sale.total;
    byMethod.set(sale.paymentMethod, m);
    for (const item of sale.items) {
      const p = byProduct.get(item.productId) ?? { quantity: 0, total: 0, profit: 0 };
      p.quantity += item.quantity;
      p.total += item.total;
      p.profit += (item.unitPrice - item.unitCost) * item.quantity;
      byProduct.set(item.productId, p);
    }
  }
  const profit = [...byProduct.values()].reduce((s, p) => s + p.profit, 0);
  const itemsSold = [...byProduct.values()].reduce((s, p) => s + p.quantity, 0);
  const productIds = [...byProduct.keys()];
  const names = new Map<string, { name: string; reference: string }>();
  for (let i = 0; i < productIds.length; i += 500) {
    const { data } = await supabase.from("products").select("id, name, reference").in("id", productIds.slice(i, i + 500));
    for (const p of data ?? []) names.set(p.id as string, { name: p.name as string, reference: p.reference as string });
  }
  const products = productIds
    .map((id) => ({ id, ...byProduct.get(id)!, ...(names.get(id) ?? { name: "Produit supprimé", reference: "" }) }))
    .sort((a, b) => b.total - a.total);

  // Achats et dépenses
  const purchasesTotal = purchases.reduce((s, p) => s + p.total, 0);
  const bySupplier = new Map<string, { name: string; count: number; total: number }>();
  for (const p of purchases) {
    const s = bySupplier.get(p.supplierId) ?? { name: p.supplier?.name ?? "—", count: 0, total: 0 };
    s.count += 1;
    s.total += p.total;
    bySupplier.set(p.supplierId, s);
  }
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = new Map<string, number>();
  for (const e of expenses) byCategory.set(e.category ?? "Sans catégorie", (byCategory.get(e.category ?? "Sans catégorie") ?? 0) + e.amount);

  const money = (v: number) => formatMoney(v, business.currency);
  const pct = (v: number) => (revenue > 0 ? `${Math.round((v / revenue) * 100)} %` : "—");

  return (
    <div>
      <DocToolbar backHref="/rapports" backLabel="Retour aux rapports">
        <PeriodPicker basePath="/rapports/document" current={sp} />
      </DocToolbar>
      <A4Document
        business={business}
        title="RAPPORT D'ACTIVITÉ"
        meta={[location.name, period.label]}
        stats={[
          { label: "Chiffre d'affaires", value: money(revenue) },
          { label: "Nombre de ventes", value: String(sales.length) },
          { label: "Articles vendus", value: String(itemsSold) },
          { label: "Bénéfice estimé", value: money(profit), strong: true },
        ]}
        printedAt={new Date()}
        printedBy={printedByName(user)}
        zindoMention={zindoMention}
      >
        <DocSection title="Résumé">
          <DocTable
            columns={[{ label: "Poste" }, { label: "Montant", align: "right" }]}
            rows={[
              { cells: ["Chiffre d'affaires (ventes)", money(revenue)] },
              { cells: ["Bénéfice estimé sur les ventes (prix de vente − prix d'achat)", money(profit)] },
              { cells: ["Dépenses de la période", `− ${money(expensesTotal)}`] },
              { cells: ["Résultat estimé (bénéfice − dépenses)", money(profit - expensesTotal)], bold: true },
              { cells: ["Achats de marchandises (pour information)", money(purchasesTotal)] },
            ]}
          />
        </DocSection>

        <DocSection title="Ventes par moyen de paiement">
          <DocTable
            empty="Aucune vente sur la période."
            columns={[{ label: "Moyen de paiement" }, { label: "Ventes", align: "center" }, { label: "Montant", align: "right" }, { label: "Part", align: "right" }]}
            rows={[...byMethod.entries()]
              .sort((a, b) => b[1].total - a[1].total)
              .map(([m, v]) => ({ key: m, cells: [PAYMENT_METHOD_LABELS[m] ?? m, v.count, money(v.total), pct(v.total)] }))}
          />
        </DocSection>

        <DocSection title="Produits vendus">
          <DocTable
            empty="Aucun produit vendu sur la période."
            columns={[
              { label: "N°" },
              { label: "Réf." },
              { label: "Désignation" },
              { label: "Qté", align: "right" },
              { label: "Montant", align: "right" },
              { label: "Bénéfice", align: "right" },
            ]}
            rows={[
              ...products.map((p, i) => ({
                key: p.id,
                cells: [i + 1, <span key="r" className="font-mono">{p.reference}</span>, p.name, p.quantity, money(p.total), money(p.profit)],
              })),
              ...(products.length
                ? [{ cells: ["", "", "Total", itemsSold, money(products.reduce((s, p) => s + p.total, 0)), money(profit)], bold: true }]
                : []),
            ]}
          />
        </DocSection>

        <DocSection title="Achats par fournisseur">
          <DocTable
            empty="Aucun achat sur la période."
            columns={[{ label: "Fournisseur" }, { label: "Achats", align: "center" }, { label: "Montant", align: "right" }]}
            rows={[
              ...[...bySupplier.entries()]
                .sort((a, b) => b[1].total - a[1].total)
                .map(([id, s]) => ({ key: id, cells: [s.name, s.count, money(s.total)] })),
              ...(bySupplier.size ? [{ cells: ["Total", purchases.length, money(purchasesTotal)], bold: true }] : []),
            ]}
          />
        </DocSection>

        <DocSection title="Dépenses par catégorie">
          <DocTable
            empty="Aucune dépense sur la période."
            columns={[{ label: "Catégorie" }, { label: "Montant", align: "right" }]}
            rows={[
              ...[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ key: c, cells: [c, money(v)] })),
              ...(byCategory.size ? [{ cells: ["Total", money(expensesTotal)], bold: true }] : []),
            ]}
          />
        </DocSection>

        <p className="mt-3 text-[10px] text-zinc-500">
          Bénéfice estimé à partir du prix d&apos;achat enregistré au moment de chaque vente ; les remises sur le total ne sont pas
          déduites du bénéfice, comme sur l&apos;écran Rapports.
        </p>
      </A4Document>
    </div>
  );
}

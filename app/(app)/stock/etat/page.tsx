import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabase-paging";
import { getCurrentLocation } from "@/lib/location";
import { formatDate, formatMoney } from "@/lib/format";
import { isDocumentEnabled, loadDocBusiness, printedByName } from "@/lib/documents";
import { isZindoMentionEnabled } from "@/lib/zindo-mention";
import { A4Document, DocSection, DocTable, type DocRow } from "@/components/documents/A4Document";
import { DocChips, DocToolbar } from "@/components/documents/DocToolbar";

type StockRow = {
  quantity: number;
  product: {
    id: string;
    reference: string;
    name: string;
    purchasePrice: number;
    salePrice: number;
    minStock: number;
    category: { name: string } | null;
  };
};

const FILTERS: Record<string, { label: string; keep: (r: StockRow) => boolean }> = {
  "": { label: "Tous les produits", keep: () => true },
  alerte: { label: "Ruptures et stocks faibles", keep: (r) => r.quantity <= r.product.minStock },
  rupture: { label: "Ruptures seulement", keep: (r) => r.quantity <= 0 },
};

/** État du stock A4 (flag « pdf_etat_stock ») : mêmes chiffres que le rapport de stock de l'écran Rapports. */
export default async function StockStatementPage({ searchParams }: { searchParams: Promise<{ filtre?: string; retour?: string }> }) {
  const user = await requirePermission(PERMISSIONS.REPORTS_VIEW);
  if (!(await isDocumentEnabled("pdf_etat_stock", user.businessId))) notFound();
  const sp = await searchParams;
  const filterKey = sp.filtre && FILTERS[sp.filtre] ? sp.filtre : "";
  const back = sp.retour === "stock" ? { href: "/stock", label: "Retour au stock" } : { href: "/rapports", label: "Retour aux rapports" };

  const [business, zindoMention, location] = await Promise.all([
    loadDocBusiness(user.businessId),
    isZindoMentionEnabled(user.businessId),
    getCurrentLocation(user.businessId),
  ]);
  if (!business || !location) notFound();

  const stocks = await fetchAllPages<StockRow>(
    (from, to) =>
      supabase
        .from("product_stocks")
        .select(
          "quantity, product:products!inner(id, reference, name, purchasePrice:purchase_price, salePrice:sale_price, minStock:min_stock, businessId:business_id, active, category:categories(name))"
        )
        .eq("location_id", location.id)
        .eq("products.business_id", user.businessId)
        .eq("products.active", true)
        .order("product_id", { ascending: true })
        .range(from, to) as unknown as PromiseLike<{ data: StockRow[] | null; error: { message: string } | null }>
  );

  // Totaux toujours calculés sur tout le stock (comme l'écran Rapports), le filtre ne réduit que la liste.
  const stockValue = stocks.reduce((s, st) => s + st.quantity * st.product.purchasePrice, 0);
  const potentialValue = stocks.reduce((s, st) => s + st.quantity * st.product.salePrice, 0);
  const outCount = stocks.filter((st) => st.quantity <= 0).length;
  const lowCount = stocks.filter((st) => st.quantity > 0 && st.quantity <= st.product.minStock).length;

  const list = stocks
    .filter(FILTERS[filterKey].keep)
    .sort(
      (a, b) =>
        (a.product.category?.name ?? "~").localeCompare(b.product.category?.name ?? "~", "fr") ||
        a.product.name.localeCompare(b.product.name, "fr")
    );
  const money = (v: number) => formatMoney(v, business.currency);
  const rows: DocRow[] = [];
  let current: string | null = null;
  let sub = { qty: 0, value: 0, sale: 0 };
  const flush = () => {
    if (current !== null) rows.push({ key: `t-${current}`, bold: true, cells: ["", `Total ${current}`, sub.qty, "", "", money(sub.value), "", money(sub.sale), ""] });
  };
  for (const st of list) {
    const cat = st.product.category?.name ?? "Sans catégorie";
    if (cat !== current) {
      flush();
      rows.push({ group: cat, key: `g-${cat}` });
      current = cat;
      sub = { qty: 0, value: 0, sale: 0 };
    }
    sub.qty += st.quantity;
    sub.value += st.quantity * st.product.purchasePrice;
    sub.sale += st.quantity * st.product.salePrice;
    rows.push({
      key: st.product.id,
      cells: [
        <span key="r" className="font-mono">{st.product.reference}</span>,
        st.product.name,
        <span key="q" className={st.quantity <= st.product.minStock ? "font-bold" : ""}>{st.quantity}</span>,
        st.product.minStock,
        money(st.product.purchasePrice),
        money(st.quantity * st.product.purchasePrice),
        money(st.product.salePrice),
        money(st.quantity * st.product.salePrice),
        st.quantity <= 0 ? "RUPTURE" : st.quantity <= st.product.minStock ? "Faible" : "",
      ],
    });
  }
  flush();

  const retour = sp.retour === "stock" ? "retour=stock" : "";
  const href = (f: string) => {
    const q = [f ? `filtre=${f}` : "", retour].filter(Boolean).join("&");
    return q ? `/stock/etat?${q}` : "/stock/etat";
  };

  return (
    <div>
      <DocToolbar backHref={back.href} backLabel={back.label}>
        <DocChips items={Object.entries(FILTERS).map(([k, f]) => ({ label: f.label, href: href(k), active: k === filterKey }))} />
      </DocToolbar>
      <A4Document
        business={business}
        title="ÉTAT DU STOCK"
        meta={[location.name, `Situation au ${formatDate(new Date())}`, FILTERS[filterKey].label]}
        stats={[
          { label: "Produits en rupture", value: String(outCount) },
          { label: "Produits à faible stock", value: String(lowCount) },
          { label: "Valeur de vente", value: money(potentialValue) },
          { label: "Valeur d'achat du stock", value: money(stockValue), strong: true },
        ]}
        printedAt={new Date()}
        printedBy={printedByName(user)}
        zindoMention={zindoMention}
      >
        <DocSection title="Produits">
          <DocTable
            empty="Aucun produit."
            columns={[
              { label: "Réf." },
              { label: "Désignation" },
              { label: "Qté", align: "right" },
              { label: "Min.", align: "right" },
              { label: "P.A.", align: "right" },
              { label: "Valeur achat", align: "right" },
              { label: "P.V.", align: "right" },
              { label: "Valeur vente", align: "right" },
              { label: "État" },
            ]}
            rows={rows}
          />
        </DocSection>
      </A4Document>
    </div>
  );
}

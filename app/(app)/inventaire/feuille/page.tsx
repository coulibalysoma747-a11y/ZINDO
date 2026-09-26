import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/supabase-paging";
import { getCurrentLocation } from "@/lib/location";
import { isDocumentEnabled, loadDocBusiness, printedByName, withQuery } from "@/lib/documents";
import { isZindoMentionEnabled } from "@/lib/zindo-mention";
import { A4Document, DocSection, DocTable, type DocRow } from "@/components/documents/A4Document";
import { DocChips, DocToolbar } from "@/components/documents/DocToolbar";

type ProductRow = {
  id: string;
  reference: string;
  name: string;
  unit: string;
  shelfLocation: string | null;
  categoryId: string | null;
  category: { name: string } | null;
};

/**
 * Feuille de comptage (flag « pdf_inventaire ») : liste des produits de la
 * boutique à imprimer, pour compter à la main dans le magasin avant de
 * saisir l'inventaire. Par défaut sans le stock théorique (comptage « à
 * l'aveugle », plus fiable) ; ?theorique=1 l'ajoute.
 */
export default async function CountSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string; theorique?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.INVENTORY_MANAGE);
  if (!(await isDocumentEnabled("pdf_inventaire", user.businessId))) notFound();
  const { categorie, theorique } = await searchParams;
  const showTheoretical = theorique === "1";

  const [business, zindoMention, location, { data: categories }] = await Promise.all([
    loadDocBusiness(user.businessId),
    isZindoMentionEnabled(user.businessId),
    getCurrentLocation(user.businessId),
    supabase.from("categories").select("id, name").eq("business_id", user.businessId).order("name"),
  ]);
  if (!business || !location) notFound();
  const category = (categories ?? []).find((c) => c.id === categorie) as { id: string; name: string } | undefined;

  const [products, stocks] = await Promise.all([
    fetchAllPages<ProductRow>((from, to) => {
      let q = supabase
        .from("products")
        .select("id, reference, name, unit, shelfLocation:shelf_location, categoryId:category_id, category:categories(name)")
        .eq("business_id", user.businessId)
        .eq("active", true);
      if (category) q = q.eq("category_id", category.id);
      return q.order("id", { ascending: true }).range(from, to) as unknown as PromiseLike<{
        data: ProductRow[] | null;
        error: { message: string } | null;
      }>;
    }),
    showTheoretical
      ? fetchAllPages<{ productId: string; quantity: number }>((from, to) =>
          supabase
            .from("product_stocks")
            .select("productId:product_id, quantity")
            .eq("location_id", location.id)
            .order("product_id", { ascending: true })
            .range(from, to) as unknown as PromiseLike<{
            data: { productId: string; quantity: number }[] | null;
            error: { message: string } | null;
          }>
        )
      : Promise.resolve([]),
  ]);
  const qty = new Map(stocks.map((s) => [s.productId, s.quantity]));

  // Classement par catégorie, puis par nom : l'ordre dans lequel on parcourt les rayons.
  products.sort(
    (a, b) =>
      (a.category?.name ?? "~").localeCompare(b.category?.name ?? "~", "fr") || a.name.localeCompare(b.name, "fr")
  );
  const rows: DocRow[] = [];
  let lastCategory: string | null | undefined;
  products.forEach((p, i) => {
    const cat = p.category?.name ?? "Sans catégorie";
    if (cat !== lastCategory) {
      rows.push({ group: cat, key: `g-${cat}` });
      lastCategory = cat;
    }
    rows.push({
      key: p.id,
      cells: [
        i + 1,
        <span key="r" className="font-mono">{p.reference}</span>,
        p.name,
        p.shelfLocation ?? "",
        p.unit,
        ...(showTheoretical ? [qty.get(p.id) ?? 0] : []),
        "",
        "",
      ],
    });
  });

  const base = "/inventaire/feuille";
  const cat = category ? `categorie=${category.id}` : null;
  return (
    <div>
      <DocToolbar backHref="/inventaire" backLabel="Retour à l'inventaire">
        <DocChips
          items={[
            { label: "Sans le stock théorique", href: withQuery(base, cat), active: !showTheoretical },
            { label: "Avec le stock théorique", href: withQuery(base, cat, "theorique=1"), active: showTheoretical },
          ]}
        />
        <form action={base} className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-slate-300">
          {showTheoretical && <input type="hidden" name="theorique" value="1" />}
          <label className="flex items-center gap-1">
            Catégorie
            <select
              name="categorie"
              defaultValue={category?.id ?? ""}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">Toutes</option>
              {(categories ?? []).map((c) => (
                <option key={c.id as string} value={c.id as string}>
                  {c.name as string}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-medium hover:bg-zinc-50 dark:border-slate-700 dark:bg-slate-900"
          >
            Afficher
          </button>
        </form>
      </DocToolbar>
      <A4Document
        business={business}
        title="FEUILLE DE COMPTAGE"
        meta={[location.name, category ? `Catégorie : ${category.name}` : "Toutes les catégories", `${products.length} produit(s)`]}
        printedAt={new Date()}
        printedBy={printedByName(user)}
        zindoMention={zindoMention}
        signatures={[{ label: "Compté par" }, { label: "Vérifié par" }]}
      >
        <p className="mt-4 text-xs">
          Date du comptage : ........................ · Heure de début : ............ · Heure de fin : ............
        </p>
        <DocSection title="Produits">
          <DocTable
            empty="Aucun produit."
            columns={[
              { label: "N°" },
              { label: "Réf." },
              { label: "Désignation" },
              { label: "Emplacement" },
              { label: "Unité" },
              ...(showTheoretical ? [{ label: "Théorique", align: "right" as const }] : []),
              { label: "Compté", className: "w-[14%]" },
              { label: "Écart", className: "w-[10%]" },
            ]}
            rows={rows}
          />
        </DocSection>
      </A4Document>
    </div>
  );
}

import Link from "next/link";
import { Plus, FileUp, FileDown, QrCode } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getCurrentLocation } from "@/lib/location";
import { getActivityConfig, resolveTerm } from "@/lib/activity-config";
import { formatMoney } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { CatalogTabs } from "@/components/products/CatalogTabs";
import { ProductSearchBar } from "./ProductSearchBar";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { ProductRowMenu } from "@/components/products/ProductRowMenu";
import { QuickPackagingButton } from "@/components/products/QuickPackagingModal";
import { isPackagingUnitsModuleEnabled } from "@/lib/actions/packaging-units";

const PAGE_SIZE = 200;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorie?: string; marque?: string; conditionnement?: string; filtre?: string; page?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);
  const { q, categorie, marque, conditionnement, filtre, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const [currentLocation, activityConfig, packagingEnabled] = await Promise.all([
    getCurrentLocation(user.businessId),
    getActivityConfig(user.business.activityKey),
    isPackagingUnitsModuleEnabled(user.businessId),
  ]);
  const productsLabel = resolveTerm(activityConfig, "products");

  // Le filtre par statut de stock ("rupture"/"stock-faible") se calcule après
  // coup à partir de la quantité en stock (jointe séparément par emplacement),
  // que la requête DB ne connaît pas — impossible d'y appliquer .range() sans
  // fausser le total/la pagination : on charge alors tout le catalogue
  // correspondant à la recherche/catégorie et on pagine nous-mêmes après
  // filtrage.
  const usesStockFilter = filtre === "stock-faible" || filtre === "rupture";

  // Deux jeux d'identifiants résolus avant de construire la requête
  // principale : les produits dont un "autre nom" correspond au terme
  // recherché (pour l'inclure dans la recherche sans jointure), et — si le
  // filtre Conditionnement est actif — ceux qui ont au moins un
  // conditionnement enregistré.
  const escapedQ = q ? q.trim().replace(/[%_\\]/g, (m) => `\\${m}`) : null;
  const [aliasMatches, packagingProductIds] = await Promise.all([
    escapedQ
      ? supabase
          .from("product_aliases")
          .select("productId:product_id, product:products!inner(businessId:business_id)")
          .eq("products.business_id", user.businessId)
          .ilike("alias", `%${escapedQ}%`)
      : Promise.resolve({ data: [] as { productId: string }[] }),
    conditionnement
      ? supabase.from("product_packaging_units").select("productId:product_id").eq("business_id", user.businessId)
      : Promise.resolve({ data: [] as { productId: string }[] }),
  ]);
  const aliasProductIds = [...new Set((aliasMatches.data ?? []).map((r) => r.productId as string))];
  const withPackagingIds = [...new Set((packagingProductIds.data ?? []).map((r) => r.productId as string))];

  let query = supabase
    .from("products")
    .select(
      "id, name, reference, brand, unit, salePrice:sale_price, minStock:min_stock, photoUrl:photo_url, categoryId:category_id, category:categories(name), trackUnits:track_units"
    )
    .eq("business_id", user.businessId)
    .eq("active", true)
    .order("name", { ascending: true });
  if (!usesStockFilter) query = query.range(offset, offset + PAGE_SIZE - 1);

  let countQuery = supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("business_id", user.businessId)
    .eq("active", true);

  if (escapedQ) {
    const orFilter =
      `name.ilike.%${escapedQ}%,reference.ilike.%${escapedQ}%,barcode.ilike.%${escapedQ}%` +
      (aliasProductIds.length > 0 ? `,id.in.(${aliasProductIds.join(",")})` : "");
    query = query.or(orFilter);
    countQuery = countQuery.or(orFilter);
  }
  if (categorie) {
    query = query.eq("category_id", categorie);
    countQuery = countQuery.eq("category_id", categorie);
  }
  if (marque) {
    query = query.eq("brand", marque);
    countQuery = countQuery.eq("brand", marque);
  }
  if (conditionnement === "avec") {
    const ids = withPackagingIds.length > 0 ? withPackagingIds : ["__none__"];
    query = query.in("id", ids);
    countQuery = countQuery.in("id", ids);
  } else if (conditionnement === "sans" && withPackagingIds.length > 0) {
    query = query.not("id", "in", `(${withPackagingIds.join(",")})`);
    countQuery = countQuery.not("id", "in", `(${withPackagingIds.join(",")})`);
  }

  const [{ data: products }, { count: rawCount }, { data: categories }, { data: brands }, stocksRes] = await Promise.all([
    query,
    countQuery,
    supabase.from("categories").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    supabase.from("brands").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    currentLocation
      ? supabase.from("product_stocks").select("productId:product_id, quantity").eq("location_id", currentLocation.id)
      : Promise.resolve({ data: [] as { productId: string; quantity: number }[] }),
  ]);

  const productIds = (products ?? []).map((p) => p.id as string);
  const { data: aliasRows } =
    productIds.length > 0
      ? await supabase.from("product_aliases").select("productId:product_id, alias").in("product_id", productIds)
      : { data: [] as { productId: string; alias: string }[] };
  const aliasesByProduct = new Map<string, string[]>();
  for (const r of aliasRows ?? []) {
    const list = aliasesByProduct.get(r.productId as string) ?? [];
    list.push(r.alias as string);
    aliasesByProduct.set(r.productId as string, list);
  }

  const stockByProduct = new Map(
    ((stocksRes.data ?? []) as { productId: string; quantity: number }[]).map((s) => [s.productId, s.quantity])
  );
  const withStock = (products ?? []).map((p) => ({
    ...p,
    category: p.category as unknown as { name: string } | null,
    quantity: stockByProduct.get(p.id as string) ?? 0,
    aliases: aliasesByProduct.get(p.id as string) ?? [],
  }));

  const stockFiltered =
    filtre === "stock-faible"
      ? withStock.filter((p) => p.quantity > 0 && p.quantity <= (p.minStock as number))
      : filtre === "rupture"
        ? withStock.filter((p) => p.quantity <= 0)
        : withStock;

  const totalCount = usesStockFilter ? stockFiltered.length : rawCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const filtered = usesStockFilter ? stockFiltered.slice(offset, offset + PAGE_SIZE) : stockFiltered;

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categorie) params.set("categorie", categorie);
    if (marque) params.set("marque", marque);
    if (conditionnement) params.set("conditionnement", conditionnement);
    if (filtre) params.set("filtre", filtre);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/produits?${qs}` : "/produits";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">{productsLabel}</h1>
          <p className="text-sm text-zinc-500">
            {totalCount ?? 0} produit(s){totalPages > 1 ? ` · page ${currentPage}/${totalPages}` : ""} · Stock affiché
            pour {currentLocation?.name ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/produits/export" variant="outline">
            <FileDown className="h-4 w-4" /> Exporter (CSV)
          </ButtonLink>
          <ButtonLink href="/produits/importer-csv" variant="outline">
            <FileUp className="h-4 w-4" /> Importer CSV
          </ButtonLink>
          <ButtonLink href="/produits/etiquettes" variant="outline">
            <QrCode className="h-4 w-4" /> QR codes
          </ButtonLink>
          <ButtonLink href="/produits/importer" variant="outline">
            <FileUp className="h-4 w-4" /> Importer un catalogue
          </ButtonLink>
          <div className="hidden sm:block">
            <ButtonLink href="/produits/nouveau">
              <Plus className="h-4 w-4" /> Nouveau produit
            </ButtonLink>
          </div>
        </div>
      </div>

      <CatalogTabs active="produits" />

      <ProductSearchBar categories={categories ?? []} brands={brands ?? []} showPackagingFilter={packagingEnabled} />

      {filtered.length === 0 ? (
        <EmptyState
          title="Aucun produit trouvé"
          description="Ajoutez votre premier produit ou modifiez vos filtres de recherche."
          action={
            <ButtonLink href="/produits/nouveau">
              <Plus className="h-4 w-4" /> Ajouter un produit
            </ButtonLink>
          }
        />
      ) : (
        <>
          {/* Tableau : bureau/tablette. En dessous de sm, une table à 7 colonnes
              n'est lisible qu'en faisant défiler horizontalement en boucle pour
              chaque produit — remplacée par une liste de cartes (voir plus bas). */}
          <Card className="hidden overflow-x-auto sm:block">
            <Table className="min-w-[720px]">
              <TableHead>
                <TableRow interactive={false}>
                  <TableHeaderCell>Produit</TableHeaderCell>
                  <TableHeaderCell>Référence</TableHeaderCell>
                  <TableHeaderCell>Catégorie</TableHeaderCell>
                  <TableHeaderCell align="right">Prix de vente</TableHeaderCell>
                  <TableHeaderCell align="right">Stock ({currentLocation?.name ?? "—"})</TableHeaderCell>
                  <TableHeaderCell>Statut</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id as string}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <ProductThumbnail photoUrl={p.photoUrl as string | null} name={p.name as string} size={40} />
                        <div className="min-w-0">
                          <Link href={`/produits/${p.id}`} className="font-medium text-zinc-900 hover:text-emerald-600 dark:text-slate-100">
                            {p.name as string}
                          </Link>
                          {p.brand ? <p className="text-xs text-zinc-400">{p.brand as string}</p> : null}
                          {p.aliases.length > 0 && (
                            <p className="truncate text-xs text-zinc-400">Aussi : {p.aliases.join(", ")}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-500">{p.reference as string}</TableCell>
                    <TableCell className="text-zinc-600 dark:text-slate-400">{p.category?.name ?? "—"}</TableCell>
                    <TableCell align="right" className="font-medium tabular-nums text-zinc-900 dark:text-slate-100">
                      {formatMoney(p.salePrice as number, user.business.currency)}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums text-zinc-700 dark:text-slate-300">
                      {p.quantity} {p.unit as string}
                    </TableCell>
                    <TableCell>
                      {p.quantity <= 0 ? (
                        <Badge tone="red">Rupture</Badge>
                      ) : p.quantity <= (p.minStock as number) ? (
                        <Badge tone="amber">Stock faible</Badge>
                      ) : (
                        <Badge tone="emerald">En stock</Badge>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <div className="flex items-center justify-end gap-1">
                        {packagingEnabled && !p.trackUnits && (
                          <QuickPackagingButton
                            productId={p.id as string}
                            productName={p.name as string}
                            baseUnit={p.unit as string}
                            basePrice={p.salePrice as number}
                            currency={user.business.currency}
                          />
                        )}
                        <ProductRowMenu productId={p.id as string} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Liste de cartes : téléphone. */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((p) => (
              <Card key={p.id as string} className="p-3">
                <div className="flex items-start gap-3">
                  <ProductThumbnail photoUrl={p.photoUrl as string | null} name={p.name as string} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/produits/${p.id}`} className="font-medium text-zinc-900 hover:text-emerald-600">
                        {p.name as string}
                      </Link>
                      <div className="flex shrink-0 items-center gap-1">
                        {packagingEnabled && !p.trackUnits && (
                          <QuickPackagingButton
                            productId={p.id as string}
                            productName={p.name as string}
                            baseUnit={p.unit as string}
                            basePrice={p.salePrice as number}
                            currency={user.business.currency}
                          />
                        )}
                        <ProductRowMenu productId={p.id as string} />
                      </div>
                    </div>
                    {p.brand ? <p className="text-xs text-zinc-400">{p.brand as string}</p> : null}
                    {p.aliases.length > 0 && (
                      <p className="truncate text-xs text-zinc-400">Aussi : {p.aliases.join(", ")}</p>
                    )}
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {p.reference as string}
                      {p.category?.name ? ` · ${p.category.name}` : ""}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-medium text-zinc-900">
                        {formatMoney(p.salePrice as number, user.business.currency)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">
                          {p.quantity} {p.unit as string}
                        </span>
                        {p.quantity <= 0 ? (
                          <Badge tone="red">Rupture</Badge>
                        ) : p.quantity <= (p.minStock as number) ? (
                          <Badge tone="amber">Faible</Badge>
                        ) : (
                          <Badge tone="emerald">OK</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              {currentPage > 1 ? (
                <ButtonLink href={pageHref(currentPage - 1)} variant="outline" size="sm">
                  Précédent
                </ButtonLink>
              ) : (
                <span />
              )}
              <span className="text-sm text-zinc-500">
                Page {currentPage} / {totalPages}
              </span>
              {currentPage < totalPages ? (
                <ButtonLink href={pageHref(currentPage + 1)} variant="outline" size="sm">
                  Suivant
                </ButtonLink>
              ) : (
                <span />
              )}
            </div>
          )}
        </>
      )}

      <Link
        href="/produits/nouveau"
        aria-label="Nouveau produit"
        className="fixed bottom-6 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 sm:hidden"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}

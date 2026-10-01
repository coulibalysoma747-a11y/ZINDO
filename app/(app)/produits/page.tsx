import Link from "next/link";
import { redirect } from "next/navigation";
import { MARKET_ONLY_ACTIVITY_KEY } from "@/lib/market";
import { Plus, FileUp, FileDown, QrCode, Trash2, Wrench, ChevronDown, Package, Boxes, AlertTriangle, PackageX } from "lucide-react";
import { requirePermission, hasPermission } from "@/lib/auth";
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
import { ProductArchiveButton } from "@/components/products/ProductArchiveButton";
import { StatCard } from "@/components/ui/StatCard";
import { QuickPackagingButton } from "@/components/products/QuickPackagingModal";
import { isPackagingUnitsModuleEnabled } from "@/lib/actions/packaging-units";
import { ensureCatalogImportFlagRegistered } from "@/lib/actions/catalog-import";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { isProductTrashEnabled } from "@/lib/product-trash";

const PAGE_SIZE = 200;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorie?: string; marque?: string; conditionnement?: string; filtre?: string; page?: string; vue?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);
  // « Vendeur du Marché » : sa liste de produits est celle de Mon Marché (publication, photos), sans notions de stock.
  if (user.business.activityKey === MARKET_ONLY_ACTIVITY_KEY) redirect("/mon-marche/produits");
  const { q, categorie, marque, conditionnement, filtre, page, vue } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const [currentLocation, activityConfig, packagingEnabled, catalogImportEnabled, trashEnabled, mobileLayout, pro] = await Promise.all([
    getCurrentLocation(user.businessId),
    getActivityConfig(user.business.activityKey),
    isPackagingUnitsModuleEnabled(user.businessId),
    // Bouton « Importer un catalogue » montré seulement si la fonction est
    // activée : sinon il menait à « Fonctionnalité pas encore disponible ».
    ensureCatalogImportFlagRegistered().then(() => isFeatureEnabled("import_catalogue_pdf", user.businessId)),
    isProductTrashEnabled(user.businessId),
    registerFeatureFlag(
      "produits_mobile",
      "Produits : page adaptée au téléphone",
      "Sur téléphone : grand bouton « Nouveau produit » en haut, outils (export, import, QR, corbeille) rangés sous « Outils », filtres repliés sous « Filtres » ; les produits sont visibles dès l'ouverture."
    ).then(() => isFeatureEnabled("produits_mobile", user.businessId)),
    isFeatureEnabled("interface_pro", user.businessId),
  ]);
  const cartes = pro && vue === "cartes";
  const [canManage, canSeeMargin] = pro
    ? await Promise.all([
        hasPermission(user.businessId, user.role, PERMISSIONS.PRODUCTS_MANAGE, user.id),
        // La marge révèle les prix d'achat : réservée à qui peut consulter les rapports.
        hasPermission(user.businessId, user.role, PERMISSIONS.REPORTS_VIEW, user.id),
      ])
    : [false, false];
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
      "id, name, reference, brand, unit, salePrice:sale_price, minStock:min_stock, photoUrl:photo_url, categoryId:category_id, category:categories(name), trackUnits:track_units, purchasePrice:purchase_price"
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

  let compteurs: { faible: number; rupture: number; tous: number; valeur: number } | null = null;
  if (pro) {
    const { data: tous } = await supabase.from("products").select("id, minStock:min_stock, purchasePrice:purchase_price").eq("business_id", user.businessId).eq("active", true);
    let faible = 0;
    let rupture = 0;
    let valeur = 0;
    for (const t of (tous ?? []) as { id: string; minStock: number; purchasePrice: number }[]) {
      const qte = stockByProduct.get(t.id) ?? 0;
      if (qte > 0) valeur += qte * (Number(t.purchasePrice) || 0);
      if (qte <= 0) rupture++;
      else if (qte <= t.minStock) faible++;
    }
    compteurs = { faible, rupture, tous: (tous ?? []).length, valeur };
  }

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
    if (cartes) params.set("vue", "cartes");
    const qs = params.toString();
    return qs ? `/produits?${qs}` : "/produits";
  };

  const lienProduits = (changes: { filtre?: string | null; vue?: string | null }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categorie) params.set("categorie", categorie);
    if (marque) params.set("marque", marque);
    if (conditionnement) params.set("conditionnement", conditionnement);
    const f = changes.filtre === undefined ? filtre : changes.filtre;
    const v = changes.vue === undefined ? (cartes ? "cartes" : null) : changes.vue;
    if (f) params.set("filtre", f);
    if (v) params.set("vue", v);
    const qs = params.toString();
    return qs ? `/produits?${qs}` : "/produits";
  };

  const tools = (
    <>
    <ButtonLink href="/produits/export" variant="outline">
      <FileDown className="h-4 w-4" /> Exporter (CSV)
    </ButtonLink>
    <ButtonLink href="/produits/importer-csv" variant="outline">
      <FileUp className="h-4 w-4" /> Importer CSV
    </ButtonLink>
    <ButtonLink href="/produits/etiquettes" variant="outline">
      <QrCode className="h-4 w-4" /> QR codes
    </ButtonLink>
    {trashEnabled && (
      <ButtonLink href="/produits/corbeille" variant="outline">
        <Trash2 className="h-4 w-4" /> Corbeille
      </ButtonLink>
    )}
    {catalogImportEnabled && (
      <ButtonLink href="/produits/importer" variant="outline">
        <FileUp className="h-4 w-4" /> Importer un catalogue
      </ButtonLink>
    )}
    </>
  );

  return (
    <div className={mobileLayout ? "space-y-4 sm:space-y-6" : "space-y-6"}>
      {pro ? (
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{productsLabel}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {totalCount ?? 0} produit(s){totalPages > 1 ? ` · page ${currentPage}/${totalPages}` : ""} · stock de {currentLocation?.name ?? "—"}
            </p>
          </div>
          <div className={`flex-wrap items-center gap-2 ${mobileLayout ? "hidden sm:flex" : "flex"}`}>
            <ButtonLink href="/produits/importer-csv" variant="outline">
              <FileUp className="h-4 w-4" /> Importer
            </ButtonLink>
            <ButtonLink href="/produits/export" variant="outline">
              <FileDown className="h-4 w-4" /> Exporter
            </ButtonLink>
            <ButtonLink href="/produits/etiquettes" variant="outline">
              <QrCode className="h-4 w-4" /> Étiquettes
            </ButtonLink>
            {(trashEnabled || catalogImportEnabled) && (
              <details className="group relative">
                <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 hover:border-zinc-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  Plus <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                </summary>
                <div className="absolute right-0 z-20 mt-2 flex w-60 flex-col gap-1.5 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900 [&>a]:w-full [&>a]:justify-start">
                  {trashEnabled && (
                    <ButtonLink href="/produits/corbeille" variant="outline">
                      <Trash2 className="h-4 w-4" /> Corbeille
                    </ButtonLink>
                  )}
                  {catalogImportEnabled && (
                    <ButtonLink href="/produits/importer" variant="outline">
                      <FileUp className="h-4 w-4" /> Importer un catalogue
                    </ButtonLink>
                  )}
                </div>
              </details>
            )}
            <div className="hidden sm:block">
              <ButtonLink href="/produits/nouveau">
                <Plus className="h-4 w-4" /> Nouveau produit
              </ButtonLink>
            </div>
          </div>
        </div>
      ) : (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">{productsLabel}</h1>
          <p className="text-sm text-zinc-500">
            {totalCount ?? 0} produit(s){totalPages > 1 ? ` · page ${currentPage}/${totalPages}` : ""} · Stock affiché
            pour {currentLocation?.name ?? "—"}
          </p>
        </div>
        <div className={`flex-wrap gap-2 ${mobileLayout ? "hidden sm:flex" : "flex"}`}>
          {tools}
          <div className="hidden sm:block">
            <ButtonLink href="/produits/nouveau">
              <Plus className="h-4 w-4" /> Nouveau produit
            </ButtonLink>
          </div>
        </div>
      </div>
      )}

      {/* Téléphone (flag produits_mobile) : l'action principale en grand, les
          outils rangés, pour voir les produits dès l'ouverture de la page. */}
      {mobileLayout && (
        <div className="space-y-2 sm:hidden">
          <ButtonLink href="/produits/nouveau" className="w-full justify-center py-3 text-base">
            <Plus className="h-5 w-5" /> Nouveau produit
          </ButtonLink>
          <details className="group rounded-xl border border-zinc-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm font-medium text-zinc-700 dark:text-slate-200">
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4" /> Outils : exporter, importer, codes QR…
              </span>
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="flex flex-wrap gap-2 border-t border-zinc-100 p-3 dark:border-slate-800">{tools}</div>
          </details>
        </div>
      )}

      <CatalogTabs active="produits" pro={pro} />

      {pro && compteurs && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Produits" value={String(compteurs.tous)} icon={Package} />
          <StatCard label="Valeur du stock" value={formatMoney(compteurs.valeur, user.business.currency)} icon={Boxes} hint="au prix d'achat" />
          <StatCard label="Stock faible" value={String(compteurs.faible)} icon={AlertTriangle} />
          <StatCard label="En rupture" value={String(compteurs.rupture)} icon={PackageX} tone={compteurs.rupture > 0 ? "red" : "emerald"} />
        </div>
      )}
      <ProductSearchBar pro={pro} categories={categories ?? []} brands={brands ?? []} showPackagingFilter={packagingEnabled} compactOnMobile={mobileLayout} />
      {pro && compteurs && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
            {[
              { key: null, label: "Tous", n: compteurs.tous, tone: "bg-[#0f7a4a] text-white", idle: "text-zinc-600 hover:text-zinc-900" },
              { key: "stock-faible", label: "Stock faible", n: compteurs.faible, tone: "bg-[#0f7a4a] text-white", idle: "text-zinc-600 hover:text-zinc-900" },
              { key: "rupture", label: "Rupture", n: compteurs.rupture, tone: "bg-[#0f7a4a] text-white", idle: "text-zinc-600 hover:text-zinc-900" },
            ].map((c) => {
              const actif = (filtre ?? null) === c.key;
              return (
                <Link key={c.label} href={lienProduits({ filtre: c.key })} className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${actif ? c.tone : c.idle}`}>
                  {c.label} <span className="tabular-nums opacity-80">{c.n}</span>
                </Link>
              );
            })}
          </div>
          <div className="hidden gap-1 rounded-xl border border-zinc-200 bg-white p-1 text-sm sm:flex dark:border-slate-700 dark:bg-slate-900">
            <Link href={lienProduits({ vue: null })} className={`rounded-lg px-3 py-1.5 font-medium ${cartes ? "bg-white text-zinc-600 hover:text-zinc-900 dark:bg-slate-900" : "bg-[#0f7a4a] text-white"}`}>
              Liste
            </Link>
            <Link href={lienProduits({ vue: "cartes" })} className={`rounded-lg px-3 py-1.5 font-medium ${cartes ? "bg-[#0f7a4a] text-white" : "bg-white text-zinc-600 hover:text-zinc-900 dark:bg-slate-900"}`}>
              Cartes
            </Link>
          </div>
        </div>
      )}

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
          {cartes ? (
            <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
                const etat = p.quantity <= 0 ? "rupture" : p.quantity <= (p.minStock as number) ? "faible" : "ok";
                return (
                  <Link
                    key={p.id as string}
                    href={`/produits/${p.id}`}
                    className="group flex gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-zindo-green-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-zinc-900 group-hover:text-zindo-green-700 dark:text-slate-100">{p.name as string}</p>
                      <p className="truncate text-xs text-zinc-400">{[p.reference as string, p.category?.name].filter(Boolean).join(" · ")}</p>
                      <p className="mt-2 font-semibold tabular-nums text-zinc-900 dark:text-slate-100">{formatMoney(p.salePrice as number, user.business.currency)}</p>
                      <p className={`mt-0.5 text-xs font-medium tabular-nums ${etat === "rupture" ? "text-red-600" : etat === "faible" ? "text-amber-600" : "text-zinc-500"}`}>
                        {etat === "rupture" ? "Rupture" : `${p.quantity} ${p.unit as string} en stock`}
                      </p>
                    </div>
                    <ProductThumbnail photoUrl={p.photoUrl as string | null} name={p.name as string} size={72} rounded="rounded-lg" />
                  </Link>
                );
              })}
            </div>
          ) : (
          <Card className="hidden overflow-x-auto sm:block">
            <Table className="min-w-[720px]">
              <TableHead>
                <TableRow interactive={false}>
                  <TableHeaderCell>Produit</TableHeaderCell>
                  {!pro && <TableHeaderCell>Référence</TableHeaderCell>}
                  <TableHeaderCell>Catégorie</TableHeaderCell>
                  <TableHeaderCell align="right">Prix de vente</TableHeaderCell>
                  {canSeeMargin && <TableHeaderCell align="right">Marge</TableHeaderCell>}
                  <TableHeaderCell align="right">Stock ({currentLocation?.name ?? "—"})</TableHeaderCell>
                  {!pro && <TableHeaderCell>Statut</TableHeaderCell>}
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
                          {pro && <p className="font-mono text-xs text-zinc-400">{p.reference as string}</p>}
                          {p.brand ? <p className="text-xs text-zinc-400">{p.brand as string}</p> : null}
                          {p.aliases.length > 0 && (
                            <p className="truncate text-xs text-zinc-400">Aussi : {p.aliases.join(", ")}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    {!pro && <TableCell className="font-mono text-xs text-zinc-500">{p.reference as string}</TableCell>}
                    <TableCell className="text-zinc-600 dark:text-slate-400">{p.category?.name ?? "—"}</TableCell>
                    <TableCell align="right" className="font-medium tabular-nums text-zinc-900 dark:text-slate-100">
                      {formatMoney(p.salePrice as number, user.business.currency)}
                    </TableCell>
                    {canSeeMargin && (
                      <TableCell align="right" className="tabular-nums text-zinc-600 dark:text-slate-400">
                        {Number(p.salePrice) - (Number(p.purchasePrice) || 0) >= 0 ? "+ " : "− "}
                        {formatMoney(Math.abs(Number(p.salePrice) - (Number(p.purchasePrice) || 0)), user.business.currency)}
                      </TableCell>
                    )}
                    <TableCell align="right" className="tabular-nums text-zinc-700 dark:text-slate-300">
                      {pro ? (
                        p.quantity <= 0 ? (
                          <Badge tone="red">Rupture</Badge>
                        ) : p.quantity <= (p.minStock as number) ? (
                          <Badge tone="amber">Faible · {p.quantity}</Badge>
                        ) : (
                          <Badge tone="emerald">{p.quantity} {p.unit as string}</Badge>
                        )
                      ) : (
                        <>{p.quantity} {p.unit as string}</>
                      )}
                    </TableCell>
                    {!pro && (
                    <TableCell>
                      {p.quantity <= 0 ? (
                        <Badge tone="red">Rupture</Badge>
                      ) : p.quantity <= (p.minStock as number) ? (
                        <Badge tone="amber">Stock faible</Badge>
                      ) : (
                        <Badge tone="emerald">En stock</Badge>
                      )}
                    </TableCell>
                    )}
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
                        {canManage && (
                          <>
                            <Link
                              href={`/produits/${p.id}/modifier`}
                              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-[12.5px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-slate-700 dark:text-slate-200"
                            >
                              Modifier
                            </Link>
                            <ProductArchiveButton id={p.id as string} name={p.name as string} trash={trashEnabled} />
                          </>
                        )}
                        <ProductRowMenu productId={p.id as string} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          )}

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

      {/* Au-dessus de la barre d'onglets du bas (≈ 4 rem) et de la barre de
          navigation Android (safe-area) : à bottom-6, le bouton passait
          dessous et n'était plus qu'à moitié visible (Tecno, Infinix…). */}
      <Link
        href="/produits/nouveau"
        aria-label="Nouveau produit"
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 sm:hidden"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}

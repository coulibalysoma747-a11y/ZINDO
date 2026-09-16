import Link from "next/link";
import { Plus, FileUp, QrCode } from "lucide-react";
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
import { ProductSearchBar } from "./ProductSearchBar";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { ProductRowMenu } from "@/components/products/ProductRowMenu";

const PAGE_SIZE = 200;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorie?: string; filtre?: string; page?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);
  const { q, categorie, filtre, page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const [currentLocation, activityConfig] = await Promise.all([
    getCurrentLocation(user.businessId),
    getActivityConfig(user.business.activityKey),
  ]);
  const productsLabel = resolveTerm(activityConfig, "products");

  let query = supabase
    .from("products")
    .select(
      "id, name, reference, brand, unit, salePrice:sale_price, minStock:min_stock, photoUrl:photo_url, categoryId:category_id, category:categories(name)"
    )
    .eq("business_id", user.businessId)
    .eq("active", true)
    .order("name", { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  let countQuery = supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("business_id", user.businessId)
    .eq("active", true);

  if (q) {
    const escaped = q.trim().replace(/[%_\\]/g, (m) => `\\${m}`);
    const orFilter = `name.ilike.%${escaped}%,reference.ilike.%${escaped}%,barcode.ilike.%${escaped}%`;
    query = query.or(orFilter);
    countQuery = countQuery.or(orFilter);
  }
  if (categorie) {
    query = query.eq("category_id", categorie);
    countQuery = countQuery.eq("category_id", categorie);
  }

  const [{ data: products }, { count: totalCount }, { data: categories }, stocksRes] = await Promise.all([
    query,
    countQuery,
    supabase.from("categories").select("id, name").eq("business_id", user.businessId).order("name", { ascending: true }),
    currentLocation
      ? supabase.from("product_stocks").select("productId:product_id, quantity").eq("location_id", currentLocation.id)
      : Promise.resolve({ data: [] as { productId: string; quantity: number }[] }),
  ]);
  const totalPages = Math.max(1, Math.ceil((totalCount ?? 0) / PAGE_SIZE));

  const stockByProduct = new Map(
    ((stocksRes.data ?? []) as { productId: string; quantity: number }[]).map((s) => [s.productId, s.quantity])
  );
  const withStock = (products ?? []).map((p) => ({
    ...p,
    category: p.category as unknown as { name: string } | null,
    quantity: stockByProduct.get(p.id as string) ?? 0,
  }));

  const filtered =
    filtre === "stock-faible"
      ? withStock.filter((p) => p.quantity > 0 && p.quantity <= (p.minStock as number))
      : filtre === "rupture"
        ? withStock.filter((p) => p.quantity <= 0)
        : withStock;

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categorie) params.set("categorie", categorie);
    if (filtre) params.set("filtre", filtre);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/produits?${qs}` : "/produits";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{productsLabel}</h1>
          <p className="text-sm text-zinc-500">
            {totalCount ?? 0} produit(s){totalPages > 1 ? ` · page ${currentPage}/${totalPages}` : ""} · Stock affiché
            pour {currentLocation?.name ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/produits/etiquettes" variant="outline">
            <QrCode className="h-4 w-4" /> QR codes
          </ButtonLink>
          <ButtonLink href="/produits/importer" variant="outline">
            <FileUp className="h-4 w-4" /> Importer un catalogue
          </ButtonLink>
          <ButtonLink href="/produits/nouveau">
            <Plus className="h-4 w-4" /> Nouveau produit
          </ButtonLink>
        </div>
      </div>

      <ProductSearchBar categories={categories ?? []} />

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
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Produit</th>
                  <th className="px-4 py-3 font-medium">Référence</th>
                  <th className="px-4 py-3 font-medium">Catégorie</th>
                  <th className="px-4 py-3 text-right font-medium">Prix de vente</th>
                  <th className="px-4 py-3 text-right font-medium">Stock ({currentLocation?.name ?? "—"})</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((p) => (
                  <tr key={p.id as string} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ProductThumbnail photoUrl={p.photoUrl as string | null} name={p.name as string} size={40} />
                        <div className="min-w-0">
                          <Link href={`/produits/${p.id}`} className="font-medium text-zinc-900 hover:text-emerald-600">
                            {p.name as string}
                          </Link>
                          {p.brand ? <p className="text-xs text-zinc-400">{p.brand as string}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.reference as string}</td>
                    <td className="px-4 py-3 text-zinc-600">{p.category?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">
                      {formatMoney(p.salePrice as number, user.business.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-700">
                      {p.quantity} {p.unit as string}
                    </td>
                    <td className="px-4 py-3">
                      {p.quantity <= 0 ? (
                        <Badge tone="red">Rupture</Badge>
                      ) : p.quantity <= (p.minStock as number) ? (
                        <Badge tone="amber">Stock faible</Badge>
                      ) : (
                        <Badge tone="emerald">En stock</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ProductRowMenu productId={p.id as string} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                      <ProductRowMenu productId={p.id as string} />
                    </div>
                    {p.brand ? <p className="text-xs text-zinc-400">{p.brand as string}</p> : null}
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
    </div>
  );
}

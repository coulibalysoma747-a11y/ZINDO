import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
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
import type { Prisma } from "@prisma/client";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categorie?: string; filtre?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);
  const { q, categorie, filtre } = await searchParams;
  const [currentLocation, activityConfig] = await Promise.all([
    getCurrentLocation(user.businessId),
    getActivityConfig(user.business.activityKey),
  ]);
  const productsLabel = resolveTerm(activityConfig, "products");

  const where: Prisma.ProductWhereInput = {
    businessId: user.businessId,
    active: true,
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
      { barcode: { contains: q, mode: "insensitive" } },
    ];
  }
  if (categorie) where.categoryId = categorie;

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        stocks: currentLocation ? { where: { locationId: currentLocation.id } } : false,
      },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.category.findMany({ where: { businessId: user.businessId }, orderBy: { name: "asc" } }),
  ]);

  const withStock = products.map((p) => ({ ...p, quantity: p.stocks[0]?.quantity ?? 0 }));

  const filtered =
    filtre === "stock-faible"
      ? withStock.filter((p) => p.quantity > 0 && p.quantity <= p.minStock)
      : filtre === "rupture"
        ? withStock.filter((p) => p.quantity <= 0)
        : withStock;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{productsLabel}</h1>
          <p className="text-sm text-zinc-500">
            {filtered.length} produit(s) · Stock affiché pour {currentLocation?.name ?? "—"}
          </p>
        </div>
        <ButtonLink href="/produits/nouveau">
          <Plus className="h-4 w-4" /> Nouveau produit
        </ButtonLink>
      </div>

      <ProductSearchBar categories={categories} />

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
        <Card className="overflow-x-auto">
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
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ProductThumbnail photoUrl={p.photoUrl} name={p.name} size={40} />
                      <div className="min-w-0">
                        <Link href={`/produits/${p.id}`} className="font-medium text-zinc-900 hover:text-emerald-600">
                          {p.name}
                        </Link>
                        {p.brand && <p className="text-xs text-zinc-400">{p.brand}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.reference}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">
                    {formatMoney(p.salePrice, user.business.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700">
                    {p.quantity} {p.unit}
                  </td>
                  <td className="px-4 py-3">
                    {p.quantity <= 0 ? (
                      <Badge tone="red">Rupture</Badge>
                    ) : p.quantity <= p.minStock ? (
                      <Badge tone="amber">Stock faible</Badge>
                    ) : (
                      <Badge tone="emerald">En stock</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ProductRowMenu productId={p.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

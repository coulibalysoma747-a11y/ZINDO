import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Archive, Boxes, CalendarClock } from "lucide-react";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime, formatMoney } from "@/lib/format";
import { isProductTrashEnabled } from "@/lib/product-trash";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { MISC_ITEM_REFERENCE } from "@/lib/misc-item";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { RestoreProductButton } from "./RestoreProductButton";
import { PermanentDeleteButton } from "./PermanentDeleteButton";
import { TRASH_RETENTION_DAYS } from "@/lib/product-trash";

/** Corbeille (flag corbeille_produits) : produits archivés, restaurables en un clic. */
export default async function ProductTrashPage() {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);
  if (!(await isProductTrashEnabled(user.businessId))) notFound();

  const [{ data: products }, canRestore, pro] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, reference, photoUrl:photo_url, salePrice:sale_price, purchasePrice:purchase_price, updatedAt:updated_at")
      .eq("business_id", user.businessId)
      .eq("active", false)
      // Fiche cachée de l'« Article divers » (toujours inactive) : ce n'est pas un produit supprimé.
      .neq("reference", MISC_ITEM_REFERENCE)
      .order("updated_at", { ascending: false })
      .limit(500),
    hasPermission(user.businessId, user.role, PERMISSIONS.PRODUCTS_MANAGE, user.id),
    isFeatureEnabled("interface_pro", user.businessId),
  ]);
  const currency = user.business.currency;

  // Stock restant (tous emplacements) des produits archivés : sert au tableau et à la valeur archivée.
  const stockById = new Map<string, number>();
  if (pro && products && products.length > 0) {
    const { data: stocks } = await supabase
      .from("product_stocks")
      .select("productId:product_id, quantity")
      .in("product_id", products.map((p) => p.id as string));
    for (const r of (stocks ?? []) as { productId: string; quantity: number }[]) {
      stockById.set(r.productId, (stockById.get(r.productId) ?? 0) + Number(r.quantity));
    }
  }
  const archivedValue = (products ?? []).reduce((sum, p) => sum + Math.max(0, stockById.get(p.id as string) ?? 0) * (Number(p.purchasePrice) || 0), 0);
  const oldest = (products ?? []).length > 0 ? (products ?? [])[(products ?? []).length - 1].updatedAt : null;

  return (
    <div className="space-y-4">
      <Link href="/produits" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux produits
      </Link>
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Corbeille des produits</h1>
        <p className="text-sm text-zinc-500">
          Produits archivés : ils n&apos;apparaissent plus dans la liste ni à la caisse, mais leur historique est
          conservé. « Restaurer » les remet en vente avec leur stock. Après {TRASH_RETENTION_DAYS} jours, un produit qui n&apos;a jamais servi dans une vente ou un achat est effacé définitivement ; vous pouvez aussi l&apos;effacer tout de suite avec « Supprimer définitivement ».
        </p>
      </div>

      {pro && products && products.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Produits dans la corbeille" value={String(products.length)} icon={Archive} />
          <StatCard label="Valeur du stock archivé" value={formatMoney(archivedValue, currency)} icon={Boxes} hint="au prix d'achat" />
          <StatCard label="Archivé depuis le plus longtemps" value={oldest ? formatDateTime(oldest as string).split(" ")[0] : "—"} icon={CalendarClock} />
        </div>
      )}

      {!products || products.length === 0 ? (
        <EmptyState title="La corbeille est vide" description="Aucun produit archivé pour le moment." />
      ) : pro ? (
        <Card className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>Produit</TableHeaderCell>
                <TableHeaderCell>Archivé le</TableHeaderCell>
                <TableHeaderCell align="right">Prix de vente</TableHeaderCell>
                <TableHeaderCell align="right">Stock restant</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id as string}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ProductThumbnail photoUrl={p.photoUrl as string | null} name={p.name as string} size={40} />
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-slate-100">{p.name as string}</p>
                        <p className="font-mono text-xs text-zinc-500">{p.reference as string}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-600">{formatDateTime(p.updatedAt as string)}</TableCell>
                  <TableCell align="right" className="font-medium tabular-nums">{formatMoney(p.salePrice as number, currency)}</TableCell>
                  <TableCell align="right" className="tabular-nums text-zinc-700">{stockById.get(p.id as string) ?? 0}</TableCell>
                  <TableCell align="right">
                    {canRestore && (
                      <div className="flex items-start justify-end gap-2">
                        <RestoreProductButton id={p.id as string} />
                        <PermanentDeleteButton id={p.id as string} name={p.name as string} />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="divide-y divide-zinc-100">
          {products.map((p) => (
            <div key={p.id as string} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-zinc-900">{p.name as string}</p>
                <p className="text-xs text-zinc-500">
                  {p.reference as string} · {formatMoney(p.salePrice as number, currency)} · archivé le{" "}
                  {formatDateTime(p.updatedAt as string)}
                </p>
              </div>
              {canRestore && <RestoreProductButton id={p.id as string} />}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

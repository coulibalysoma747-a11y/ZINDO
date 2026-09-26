import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDateTime, formatMoney } from "@/lib/format";
import { isProductTrashEnabled } from "@/lib/product-trash";
import { MISC_ITEM_REFERENCE } from "@/lib/misc-item";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";
import { RestoreProductButton } from "./RestoreProductButton";

/** Corbeille (flag corbeille_produits) : produits archivés, restaurables en un clic. */
export default async function ProductTrashPage() {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);
  if (!(await isProductTrashEnabled(user.businessId))) notFound();

  const [{ data: products }, canRestore] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, reference, salePrice:sale_price, updatedAt:updated_at")
      .eq("business_id", user.businessId)
      .eq("active", false)
      // Fiche cachée de l'« Article divers » (toujours inactive) : ce n'est pas un produit supprimé.
      .neq("reference", MISC_ITEM_REFERENCE)
      .order("updated_at", { ascending: false })
      .limit(500),
    hasPermission(user.businessId, user.role, PERMISSIONS.PRODUCTS_MANAGE, user.id),
  ]);
  const currency = user.business.currency;

  return (
    <div className="space-y-4">
      <Link href="/produits" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux produits
      </Link>
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Corbeille des produits</h1>
        <p className="text-sm text-zinc-500">
          Produits archivés : ils n&apos;apparaissent plus dans la liste ni à la caisse, mais leur historique est
          conservé. « Restaurer » les remet en vente avec leur stock.
        </p>
      </div>

      {!products || products.length === 0 ? (
        <EmptyState title="La corbeille est vide" description="Aucun produit archivé pour le moment." />
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

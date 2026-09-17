import { Images } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/Empty";
import { ProductPhotoTile } from "./ProductPhotoTile";

type ProductRow = { id: string; name: string; photoUrl: string | null };

export default async function ProductPhotosPage() {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);

  const { data } = await supabase
    .from("products")
    .select("id, name, photoUrl:photo_url")
    .eq("business_id", user.businessId)
    .eq("active", true)
    .order("name", { ascending: true });
  const products = (data ?? []) as unknown as ProductRow[];
  const withoutPhoto = products.filter((p) => !p.photoUrl).length;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Images className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Photos produits</h1>
          <p className="text-sm text-zinc-500">
            {products.length} produit(s) — {withoutPhoto} sans photo. Cliquez sur une vignette pour l&apos;ajouter ou la remplacer.
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState title="Aucun produit" />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {products.map((p) => (
            <ProductPhotoTile key={p.id} productId={p.id} name={p.name} photoUrl={p.photoUrl} />
          ))}
        </div>
      )}
    </div>
  );
}

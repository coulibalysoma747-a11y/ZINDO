import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { StockMovementForm } from "@/components/stock/StockMovementForm";

export default async function StockOutPage({
  searchParams,
}: {
  searchParams: Promise<{ produit?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.STOCK_MANAGE);
  const { produit } = await searchParams;

  const [locations, currentLocation] = await Promise.all([
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
  ]);

  let initialProduct = null;
  if (produit) {
    const { data: rawProduct } = await supabase
      .from("products")
      .select("id, name, reference, unit, salePrice:sale_price, purchasePrice:purchase_price")
      .eq("id", produit)
      .eq("business_id", user.businessId)
      .maybeSingle();
    if (rawProduct) {
      const { data: stockRow } = await supabase
        .from("product_stocks")
        .select("quantity")
        .eq("product_id", rawProduct.id as string)
        .eq("location_id", currentLocation?.id ?? "")
        .maybeSingle();
      initialProduct = { ...rawProduct, quantity: (stockRow?.quantity as number | undefined) ?? 0 };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Sortie de stock</h1>
        <p className="text-sm text-zinc-500">
          Enregistrez un produit endommagé, une perte, un retour fournisseur ou une correction.
        </p>
      </div>
      <StockMovementForm
        direction="OUT"
        initialProduct={initialProduct}
        locations={locations}
        defaultLocationId={currentLocation?.id}
        currency={user.business.currency}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getCurrentLocation } from "@/lib/location";
import { getBusinessSettings } from "@/lib/business-settings";
import { BulkStockFillForm } from "./BulkStockFillForm";

export default async function BulkStockFillPage() {
  const user = await requirePermission(PERMISSIONS.STOCK_MANAGE);
  const businessSettings = await getBusinessSettings(user.businessId);
  if (!businessSettings.bulkStockFillEnabled) notFound();

  const currentLocation = await getCurrentLocation(user.businessId);
  if (!currentLocation) notFound();

  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, reference, unit, stocks:product_stocks(locationId:location_id, quantity)")
    .eq("business_id", user.businessId)
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(500);

  const products = ((productsData ?? []) as unknown as Array<{
    id: string;
    name: string;
    reference: string;
    unit: string;
    stocks: { locationId: string; quantity: number }[];
  }>).map((p) => ({
    id: p.id,
    name: p.name,
    reference: p.reference,
    unit: p.unit,
    currentQuantity: p.stocks.find((s) => s.locationId === currentLocation.id)?.quantity ?? 0,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Remplir le stock en un clic</h1>
        <p className="text-sm text-zinc-500">
          {currentLocation.name} — cochez les produits, entrez une quantité groupée puis ajustez chaque ligne si besoin.
        </p>
      </div>
      <BulkStockFillForm products={products} locationId={currentLocation.id} />
    </div>
  );
}

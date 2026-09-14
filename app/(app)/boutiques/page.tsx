import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { LocationManager } from "./LocationManager";

type LocationRow = {
  id: string;
  name: string;
  type: "BOUTIQUE" | "DEPOT";
  address: string | null;
  city: string | null;
  isDefault: boolean;
  active: boolean;
  stocks: Array<{ quantity: number; product: { purchasePrice: number } }>;
};

export default async function LocationsPage() {
  const user = await requirePermission(PERMISSIONS.LOCATIONS_MANAGE);

  const { data } = await supabase
    .from("locations")
    .select(
      "id, name, type, address, city, isDefault:is_default, active, stocks:product_stocks(quantity, product:products(purchasePrice:purchase_price))"
    )
    .eq("business_id", user.businessId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });
  const locations = (data ?? []) as unknown as LocationRow[];

  const rows = locations.map((l) => ({
    id: l.id,
    name: l.name,
    type: l.type,
    address: l.address,
    city: l.city,
    isDefault: l.isDefault,
    active: l.active,
    stockValue: l.stocks.reduce((s, st) => s + st.quantity * st.product.purchasePrice, 0),
    productCount: l.stocks.filter((s) => s.quantity > 0).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Boutiques &amp; dépôts</h1>
          <p className="text-sm text-zinc-500">
            Gérez vos points de vente et dépôts. {rows.length} emplacement(s).
          </p>
        </div>
      </div>

      <LocationManager locations={rows} currency={user.business.currency} />
    </div>
  );
}

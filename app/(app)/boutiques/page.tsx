import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { LocationManager } from "./LocationManager";

export default async function LocationsPage() {
  const user = await requirePermission(PERMISSIONS.LOCATIONS_MANAGE);

  const locations = await prisma.location.findMany({
    where: { businessId: user.businessId },
    include: { stocks: { include: { product: true } } },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

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

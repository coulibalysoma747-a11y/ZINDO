import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { StockMovementForm } from "@/components/stock/StockMovementForm";

export default async function StockInPage({
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

  const rawProduct = produit
    ? await prisma.product.findFirst({ where: { id: produit, businessId: user.businessId } })
    : null;
  const initialStock = rawProduct
    ? await prisma.productStock.findUnique({
        where: { productId_locationId: { productId: rawProduct.id, locationId: currentLocation?.id ?? "" } },
      })
    : null;
  const initialProduct = rawProduct ? { ...rawProduct, quantity: initialStock?.quantity ?? 0 } : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Entrée de stock</h1>
        <p className="text-sm text-zinc-500">Enregistrez une réception d&apos;achat, un retour client ou une correction.</p>
      </div>
      <StockMovementForm
        direction="IN"
        initialProduct={initialProduct}
        locations={locations}
        defaultLocationId={currentLocation?.id}
        currency={user.business.currency}
      />
    </div>
  );
}

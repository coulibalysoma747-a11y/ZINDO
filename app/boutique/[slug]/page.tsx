import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { StorefrontView } from "./StorefrontView";

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const store = await prisma.onlineStore.findUnique({
    where: { slug },
    include: { business: true },
  });

  if (!store || !store.published || !store.locationId) notFound();

  const enabled = await isFeatureEnabled("boutique_en_ligne", store.businessId);
  if (!enabled) notFound();

  const stocks = await prisma.productStock.findMany({
    where: { locationId: store.locationId, quantity: { gt: 0 } },
    include: { product: true },
  });

  const products = stocks
    .filter((s) => s.product.active)
    .map((s) => ({
      id: s.product.id,
      name: s.product.name,
      unit: s.product.unit,
      salePrice: s.product.salePrice,
      photoUrl: s.product.photoUrl,
      available: s.quantity,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="theme-locked min-h-screen bg-zinc-50">
      <StorefrontView
        store={{
          slug: store.slug,
          storeName: store.storeName,
          description: store.description,
          contactPhone: store.contactPhone,
          deliveryEnabled: store.deliveryEnabled,
          deliveryFee: store.deliveryFee,
          freeDeliveryAbove: store.freeDeliveryAbove,
          currency: store.business.currency,
          businessName: store.business.name,
        }}
        products={products}
      />
    </div>
  );
}

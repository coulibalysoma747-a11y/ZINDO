import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { StorefrontView } from "./StorefrontView";

type StoreRow = {
  slug: string;
  storeName: string;
  description: string | null;
  contactPhone: string | null;
  locationId: string | null;
  published: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeDeliveryAbove: number | null;
  businessId: string;
  business: { currency: string; name: string };
};

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data } = await supabase
    .from("online_stores")
    .select(
      "slug, storeName:store_name, description, contactPhone:contact_phone, locationId:location_id, published, deliveryEnabled:delivery_enabled, deliveryFee:delivery_fee, freeDeliveryAbove:free_delivery_above, businessId:business_id, business:businesses(currency, name)"
    )
    .eq("slug", slug)
    .maybeSingle();
  const store = data as unknown as StoreRow | null;

  if (!store || !store.published || !store.locationId) notFound();

  const enabled = await isFeatureEnabled("boutique_en_ligne", store.businessId);
  if (!enabled) notFound();

  const { data: stocksData } = await supabase
    .from("product_stocks")
    .select("quantity, product:products!inner(id, name, unit, salePrice:sale_price, photoUrl:photo_url, active)")
    .eq("location_id", store.locationId)
    .gt("quantity", 0);

  const stocks = (stocksData ?? []) as unknown as Array<{
    quantity: number;
    product: { id: string; name: string; unit: string; salePrice: number; photoUrl: string | null; active: boolean };
  }>;

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

import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { StorefrontView } from "./StorefrontView";

type StoreRow = {
  slug: string;
  storeName: string;
  tagline: string | null;
  description: string | null;
  coverPhotoUrl: string | null;
  contactPhone: string | null;
  whatsappNumber: string | null;
  address: string | null;
  city: string | null;
  footerMessage: string | null;
  locationId: string | null;
  published: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeDeliveryAbove: number | null;
  deliveryNote: string | null;
  pickupEnabled: boolean;
  payOnDeliveryEnabled: boolean;
  mobileMoneyEnabled: boolean;
  mobileMoneyNumber: string | null;
  minOrderAmount: number;
  showOutOfStock: boolean;
  businessId: string;
  business: { currency: string; name: string };
};

export default async function StorefrontPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data } = await supabase
    .from("online_stores")
    .select(
      "slug, storeName:store_name, tagline, description, coverPhotoUrl:cover_photo_url, contactPhone:contact_phone, whatsappNumber:whatsapp_number, address, city, footerMessage:footer_message, locationId:location_id, published, " +
        "deliveryEnabled:delivery_enabled, deliveryFee:delivery_fee, freeDeliveryAbove:free_delivery_above, deliveryNote:delivery_note, pickupEnabled:pickup_enabled, payOnDeliveryEnabled:pay_on_delivery_enabled, " +
        "mobileMoneyEnabled:mobile_money_enabled, mobileMoneyNumber:mobile_money_number, minOrderAmount:min_order_amount, showOutOfStock:show_out_of_stock, businessId:business_id, business:businesses(currency, name)"
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
    .eq("location_id", store.locationId);

  const stocks = (stocksData ?? []) as unknown as Array<{
    quantity: number;
    product: { id: string; name: string; unit: string; salePrice: number; photoUrl: string | null; active: boolean };
  }>;

  const products = stocks
    .filter((s) => s.product.active && (s.quantity > 0 || store.showOutOfStock))
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
          tagline: store.tagline,
          description: store.description,
          coverPhotoUrl: store.coverPhotoUrl,
          contactPhone: store.contactPhone,
          whatsappNumber: store.whatsappNumber,
          address: store.address,
          city: store.city,
          footerMessage: store.footerMessage,
          deliveryEnabled: store.deliveryEnabled,
          deliveryFee: store.deliveryFee,
          freeDeliveryAbove: store.freeDeliveryAbove,
          deliveryNote: store.deliveryNote,
          pickupEnabled: store.pickupEnabled,
          payOnDeliveryEnabled: store.payOnDeliveryEnabled,
          mobileMoneyEnabled: store.mobileMoneyEnabled,
          mobileMoneyNumber: store.mobileMoneyNumber,
          minOrderAmount: store.minOrderAmount,
          currency: store.business.currency,
          businessName: store.business.name,
        }}
        products={products}
      />
    </div>
  );
}

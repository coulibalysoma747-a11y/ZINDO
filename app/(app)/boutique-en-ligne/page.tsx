import { headers } from "next/headers";
import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getLocations } from "@/lib/location";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { OnlineStoreForm } from "./OnlineStoreForm";
import { OnlineStoreTabs } from "./OnlineStoreTabs";

export default async function OnlineStorePage() {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const enabled = await isFeatureEnabled("boutique_en_ligne", user.businessId);
  if (!enabled) {
    return (
      <EmptyState
        title="Fonctionnalité pas encore disponible"
        description="La Boutique en ligne n'est pas encore activée pour votre compte. Contactez l'administrateur de la plateforme si vous souhaitez y avoir accès."
      />
    );
  }

  const { data: storeData } = await supabase
    .from("online_stores")
    .select(
      "id, slug, storeName:store_name, tagline, description, coverPhotoUrl:cover_photo_url, contactPhone:contact_phone, whatsappNumber:whatsapp_number, address, city, footerMessage:footer_message, locationId:location_id, " +
        "deliveryEnabled:delivery_enabled, deliveryFee:delivery_fee, freeDeliveryAbove:free_delivery_above, deliveryNote:delivery_note, pickupEnabled:pickup_enabled, payOnDeliveryEnabled:pay_on_delivery_enabled, " +
        "mobileMoneyEnabled:mobile_money_enabled, mobileMoneyNumber:mobile_money_number, minOrderAmount:min_order_amount, showOutOfStock:show_out_of_stock, published"
    )
    .eq("business_id", user.businessId)
    .maybeSingle();
  const store = storeData as unknown as {
    id: string;
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
    published: boolean;
  } | null;

  const [locations, { count: pendingOrders }] = await Promise.all([
    getLocations(user.businessId),
    store
      ? supabase
          .from("online_orders")
          .select("id", { count: "exact", head: true })
          .eq("store_id", store.id)
          .eq("status", "EN_ATTENTE")
      : Promise.resolve({ count: 0 }),
  ]);

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const publicUrl = store ? `${protocol}://${host}/boutique/${store.slug}` : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-orange-500" />
            <h1 className="text-xl font-bold text-zinc-900">Boutique en ligne</h1>
          </div>
          <p className="text-sm text-zinc-500">
            Votre boutique qui ne ferme jamais : le même stock, les mêmes prix, ouverts 24h/24 sur un simple lien à
            partager.
          </p>
        </div>
      </div>

      <OnlineStoreTabs active="vitrine" pendingCount={pendingOrders ?? 0} />

      {publicUrl && store?.published && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardBody className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Votre boutique est en ligne
              </p>
              <Link href={publicUrl} target="_blank" className="text-sm font-medium text-emerald-800 hover:underline">
                {publicUrl}
              </Link>
            </div>
            <ButtonLink href="/boutique-en-ligne/partager" variant="outline" size="sm">
              Partager
            </ButtonLink>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Ma vitrine</h2>
        </CardHeader>
        <CardBody>
          <OnlineStoreForm store={store} locations={locations.map((l) => ({ id: l.id, name: l.name }))} />
        </CardBody>
      </Card>
    </div>
  );
}

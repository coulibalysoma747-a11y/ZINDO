import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getLocations } from "@/lib/location";
import { slugifyShopName } from "@/lib/market";
import { requireMarketSeller } from "@/lib/market-seller";
import { Card, CardBody } from "@/components/ui/Card";
import { MarketSellerNav } from "../MarketSellerNav";
import { MarketShopForm, type MarketShopFormValues } from "../MarketShopForm";

/** Ma boutique : page publique, livraison, retrait et paiements (Mon Marché). */
export default async function MyMarketShopPage() {
  const { user, shop: shopInfo, newOrders, unreadMessages } = await requireMarketSeller(PERMISSIONS.SETTINGS_MANAGE);
  const [locations, { data }] = await Promise.all([
    getLocations(user.businessId),
    supabase
      .from("market_shops")
      .select(
        "slug, name, description, logoUrl:logo_url, coverUrl:cover_url, phone, whatsapp, city, address, hours, locationId:location_id, published, " +
          "deliveryEnabled:delivery_enabled, deliveryFee:delivery_fee, deliveryNote:delivery_note, pickupEnabled:pickup_enabled, payOnDelivery:pay_on_delivery, payOnPickup:pay_on_pickup, mobileMoneyEnabled:mobile_money_enabled, orangeMoneyNumber:orange_money_number, moovMoneyNumber:moov_money_number"
      )
      .eq("business_id", user.businessId)
      .maybeSingle(),
  ]);
  const shop = data as unknown as MarketShopFormValues | null;

  return (
    <div className="max-w-5xl space-y-6">
      <MarketSellerNav active="/mon-marche/boutique" shop={shopInfo} newOrders={newOrders} unreadMessages={unreadMessages} />
      {!shop && (
        <p className="rounded-xl bg-zindo-green-50 p-4 text-sm text-zindo-green-900 ring-1 ring-zindo-green-200">
          Bienvenue ! Créez votre boutique en 1 minute : elle apparaîtra sur le Marché ZINDO et vous pourrez publier vos produits du stock.
        </p>
      )}
      <Card>
        <CardBody>
          <MarketShopForm
            locations={locations.filter((l) => l.active).map((l) => ({ id: l.id, name: l.name }))}
            shop={
              shop ?? {
                name: user.business.name,
                slug: slugifyShopName(user.business.name),
                description: null,
                logoUrl: user.business.logoUrl,
                coverUrl: null,
                phone: user.business.phone,
                whatsapp: user.business.phone,
                city: user.business.city,
                address: user.business.address,
                hours: null,
                locationId: null,
                published: true,
                deliveryEnabled: false,
                deliveryFee: 0,
                deliveryNote: null,
                pickupEnabled: true,
                payOnDelivery: true,
                payOnPickup: true,
                mobileMoneyEnabled: false,
                orangeMoneyNumber: null,
                moovMoneyNumber: null,
              }
            }
          />
        </CardBody>
      </Card>
    </div>
  );
}

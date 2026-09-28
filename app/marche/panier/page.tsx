import { getCurrentBuyer } from "@/lib/market-buyer";
import { CartView } from "./CartView";

export const dynamic = "force-dynamic";

export default async function MarketCartPage() {
  const buyer = await getCurrentBuyer();
  return <CartView buyer={buyer ? { name: buyer.name, phone: buyer.phone, city: buyer.city, address: buyer.address } : null} />;
}

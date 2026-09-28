import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getBuyerFavorites, getCurrentBuyer } from "@/lib/market-buyer";
import { loadMarketProducts, loadPublishedShops } from "@/lib/market-data";
import { MarketProductGrid } from "@/components/market/MarketProductCard";
import { ShopCard } from "@/components/market/ShopChip";

export const dynamic = "force-dynamic";

export default async function MarketFavoritesPage() {
  if (!(await getCurrentBuyer())) redirect("/marche/compte?suite=/marche/favoris");
  const [favorites, shops] = await Promise.all([getBuyerFavorites(), loadPublishedShops()]);

  const { data: listingRows } = favorites.listingIds.size
    ? await supabase.from("market_listings").select("productId:product_id").in("id", [...favorites.listingIds])
    : { data: [] };
  const productIds = (listingRows ?? []).map((r) => r.productId as string);
  const products = productIds.length ? await loadMarketProducts({ shops, productIds, limit: 200 }) : [];
  const followed = shops.filter((s) => favorites.shopIds.has(s.id));

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-zinc-900">Mes favoris</h1>
      <section className="space-y-3">
        <h2 className="font-semibold text-zinc-800">Produits ({products.length})</h2>
        {products.length > 0 ? (
          <MarketProductGrid products={products} favorites={favorites.listingIds} />
        ) : (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">
            Touchez le ❤️ d&apos;un produit pour le retrouver ici.{" "}
            <Link href="/marche" className="font-semibold text-zindo-green-700 underline">
              Découvrir le Marché
            </Link>
          </p>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-zinc-800">Boutiques suivies ({followed.length})</h2>
        {followed.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {followed.map((s) => (
              <ShopCard key={s.slug} shop={s} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">Suivez une boutique depuis sa page pour la retrouver ici.</p>
        )}
      </section>
    </div>
  );
}

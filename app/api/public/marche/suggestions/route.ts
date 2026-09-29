import { NextResponse, type NextRequest } from "next/server";
import { canViewMarket, loadMarketProducts, loadPublishedShops } from "@/lib/market-data";

/**
 * Suggestions de la barre de recherche du Marché (pendant la frappe) :
 * quelques produits et boutiques, en une réponse légère.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2 || !(await canViewMarket())) return NextResponse.json({ products: [], shops: [] });

  const shops = await loadPublishedShops();
  const term = q.toLowerCase();
  const products = await loadMarketProducts({ shops, q, sort: "populaires", boostFirst: true, limit: 6 });
  return NextResponse.json(
    {
      products: products.map((p) => ({
        id: p.productId,
        name: p.name,
        photoUrl: p.photoUrl,
        price: p.promoPrice ?? p.price,
        currency: p.currency,
        shop: p.shop.name,
        available: p.available > 0,
      })),
      shops: shops
        .filter((s) => s.name.toLowerCase().includes(term))
        .slice(0, 3)
        .map((s) => ({ slug: s.slug, name: s.name, city: s.city, logoUrl: s.logoUrl, verified: s.verified })),
    },
    // Réponse publique : les navigateurs et Vercel peuvent la garder quelques secondes.
    { headers: { "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60" } }
  );
}

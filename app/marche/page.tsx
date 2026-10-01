import { vignette } from "@/lib/vignette";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, ChevronRight, ShieldCheck, Smartphone, Store, Truck } from "lucide-react";
import { loadActiveBoosts, loadMarketProducts, loadPublishedShops } from "@/lib/market-data";
import { getBuyerFavorites } from "@/lib/market-buyer";
import { MARKET_CATEGORIES } from "@/lib/market";
import { MarketProductGrid, MarketProductRow } from "@/components/market/MarketProductCard";
import { ShopCard } from "@/components/market/ShopChip";
import { CategoryIcon } from "@/components/market/CategoryIcon";

export const dynamic = "force-dynamic";

/** Accueil du Marché ZINDO. Toute recherche ou filtre ouvre /marche/recherche. */
export default async function MarketHomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  // Anciens liens (/marche?q=…, ?categorie=…, ?promo=1) : même résultat dans la page de recherche.
  if (params.q || params.categorie || params.promo) {
    redirect(`/marche/recherche?${new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString()}`);
  }

  const [shops, boosts] = await Promise.all([loadPublishedShops(), loadActiveBoosts()]);
  const [featured, popular, promos, latest, favorites] = await Promise.all([
    boosts.listingIds.size ? loadMarketProducts({ shops, listingIds: [...boosts.listingIds], sort: "populaires", limit: 10 }) : Promise.resolve([]),
    loadMarketProducts({ shops, sort: "populaires", limit: 10 }),
    loadMarketProducts({ shops, promoOnly: true, limit: 10 }),
    loadMarketProducts({ shops, limit: 20 }),
    getBuyerFavorites(),
  ]);
  const boostedShops = shops.filter((s) => s.boosted);
  const featuredShops = [...shops]
    .filter((s) => !s.boosted)
    .sort((a, b) => Number(b.verified) - Number(a.verified) || (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 8);
  const heroPhotos = latest.slice(0, 4);

  return (
    <div className="space-y-10">
      {/* Bannière */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-zindo-green-700 via-zindo-green-800 to-zindo-green-950 text-white">
        <div className="grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <Store className="h-3.5 w-3.5" /> Marché ZINDO
            </p>
            <h1 className="text-2xl font-extrabold leading-tight sm:text-4xl">Découvrez les produits et boutiques des commerçants près de chez vous</h1>
            <p className="text-sm text-white/80 sm:text-base">Stock réel, vendeurs identifiés, livraison ou retrait en boutique.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/marche/recherche?promo=1" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-zindo-green-800 shadow hover:bg-zindo-green-50">
                Voir les promotions
              </Link>
              <Link href="/marche/boutiques" className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
                Explorer les boutiques
              </Link>
            </div>
          </div>
          {heroPhotos.length >= 4 && (
            <div className="hidden grid-cols-2 gap-3 lg:grid">
              {heroPhotos.map((p, i) => (
                <Link key={p.listingId} href={`/marche/produit/${p.productId}`} className={`overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20 ${i % 2 ? "translate-y-6" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vignette(p.photoUrl, 300) ?? ""} loading="lazy" decoding="async" alt={p.name} className="aspect-[4/3] w-full object-cover" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Confiance */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: BadgeCheck, title: "Vendeurs vérifiés", text: "Badge délivré par ZINDO" },
          { icon: ShieldCheck, title: "Stock réel", text: "Relié à la caisse du vendeur" },
          { icon: Truck, title: "Livraison ou retrait", text: "Selon la boutique" },
          { icon: Smartphone, title: "Paiement simple", text: "À la livraison ou Mobile Money" },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-zinc-200">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zindo-green-50 text-zindo-green-700">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900">{title}</p>
              <p className="truncate text-xs text-zinc-500">{text}</p>
            </div>
          </div>
        ))}
      </section>

      <section>
        <SectionTitle title="Catégories" href="/marche/categories" />
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-7 sm:px-0">
          {MARKET_CATEGORIES.map((c) => (
            <Link key={c.key} href={`/marche/recherche?categorie=${c.key}`} className="group flex w-20 shrink-0 flex-col items-center gap-2 text-center sm:w-auto">
              <span className="transition group-hover:scale-105">
                <CategoryIcon category={c.key} size={60} />
              </span>
              <span className="text-xs font-medium leading-tight text-zinc-700">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section>
          <SectionTitle title="Produits mis en avant" />
          <MarketProductRow products={featured} favorites={favorites.listingIds} />
        </section>
      )}

      {boostedShops.length > 0 && (
        <section>
          <SectionTitle title="Boutiques mises en avant" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {boostedShops.map((s) => (
              <ShopCard key={s.slug} shop={s} />
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section>
          <SectionTitle title="Produits populaires" href="/marche/recherche?tri=populaires" />
          <MarketProductRow products={popular} favorites={favorites.listingIds} />
        </section>
      )}

      {promos.length > 0 && (
        <section>
          <SectionTitle title="Promotions" href="/marche/recherche?promo=1" />
          <MarketProductRow products={promos} favorites={favorites.listingIds} />
        </section>
      )}

      {featuredShops.length > 0 && (
        <section>
          <SectionTitle title="Boutiques" href="/marche/boutiques" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredShops.map((s) => (
              <ShopCard key={s.slug} shop={s} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle title="Nouveautés" href="/marche/recherche?tri=recents" />
        {latest.length > 0 ? (
          <MarketProductGrid products={latest} favorites={favorites.listingIds} />
        ) : (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">Les premiers produits arrivent bientôt.</p>
        )}
      </section>

      {/* Appel aux commerçants */}
      <section className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-zinc-900 p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="text-lg font-bold">Vous êtes commerçant ?</p>
          <p className="text-sm text-white/70">Vendez sur le Marché gratuitement, sans abonnement ni commission. Vous ne payez que pour mettre vos produits en avant.</p>
        </div>
        <Link href="/inscription?vendeur=marche" className="shrink-0 rounded-xl bg-zindo-green-500 px-5 py-3 text-sm font-bold text-white hover:bg-zindo-green-600">
          Vendre sur le Marché
        </Link>
      </section>
    </div>
  );
}

function SectionTitle({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-bold text-zinc-900 sm:text-xl">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex items-center text-sm font-semibold text-zindo-green-700 hover:underline">
          Voir tout <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

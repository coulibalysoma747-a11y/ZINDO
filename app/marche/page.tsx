import Link from "next/link";
import { loadMarketProducts, loadPublishedShops } from "@/lib/market-data";
import { MARKET_CATEGORIES, isMarketCategory, marketCategoryLabel } from "@/lib/market";
import { MarketProductGrid } from "@/components/market/MarketProductCard";
import { ShopChip } from "@/components/market/ShopChip";

export const dynamic = "force-dynamic";

/** Accueil du Marché, résultats de recherche et filtre par catégorie. */
export default async function MarketHomePage({ searchParams }: { searchParams: Promise<{ q?: string; categorie?: string; promo?: string }> }) {
  const { q = "", categorie = "", promo } = await searchParams;
  const category = isMarketCategory(categorie) ? categorie : "";
  const shops = await loadPublishedShops();
  const term = q.trim().toLowerCase();

  if (term || category || promo) {
    const [products, matchingShops] = [
      await loadMarketProducts({ shops, q: term, category, promoOnly: !!promo, limit: 100 }),
      term ? shops.filter((s) => s.name.toLowerCase().includes(term) || (s.city ?? "").toLowerCase().includes(term)) : [],
    ];
    const title = promo ? "Promotions" : category ? marketCategoryLabel(category) : `Résultats pour « ${q.trim()} »`;
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-zinc-900">{title}</h1>
          <Link href="/marche" className="text-sm font-medium text-zindo-green-700 hover:underline">
            Retour à l&apos;accueil
          </Link>
        </div>
        {matchingShops.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {matchingShops.map((s) => (
              <ShopChip key={s.slug} shop={s} />
            ))}
          </div>
        )}
        {products.length > 0 ? (
          <MarketProductGrid products={products} />
        ) : (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-500">Aucun produit trouvé.</p>
        )}
      </div>
    );
  }

  const [latest, promos] = await Promise.all([
    loadMarketProducts({ shops, limit: 20 }),
    loadMarketProducts({ shops, promoOnly: true, limit: 10 }),
  ]);
  const verifiedShops = shops.filter((s) => s.verified);

  return (
    <div className="space-y-7">
      <section className="rounded-3xl bg-gradient-to-br from-zindo-green-600 to-zindo-green-800 p-5 text-white sm:p-8">
        <h1 className="text-xl font-extrabold sm:text-3xl">Bienvenue sur le Marché ZINDO</h1>
        <p className="mt-1 text-sm text-white/85 sm:text-base">Les produits des commerçants près de chez vous, en stock réel.</p>
        {promos.length > 0 && (
          <Link href="/marche?promo=1" className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm font-bold text-zindo-green-700">
            Voir les promotions
          </Link>
        )}
      </section>

      <section>
        <SectionTitle title="Catégories" href="/marche/categories" />
        <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-7 sm:overflow-visible">
          {MARKET_CATEGORIES.map((c) => (
            <Link key={c.key} href={`/marche?categorie=${c.key}`} className="flex w-20 shrink-0 flex-col items-center gap-1 text-center sm:w-auto">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-zinc-200">{c.emoji}</span>
              <span className="text-xs font-medium leading-tight text-zinc-700">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {promos.length > 0 && (
        <section>
          <SectionTitle title="🎁 Promotions" href="/marche?promo=1" />
          <MarketProductGrid products={promos} />
        </section>
      )}

      {verifiedShops.length > 0 && (
        <section>
          <SectionTitle title="🏪 Boutiques vérifiées" href="/marche/boutiques" />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {verifiedShops.map((s) => (
              <ShopChip key={s.slug} shop={s} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle title="🆕 Nouveautés" />
        {latest.length > 0 ? (
          <MarketProductGrid products={latest} />
        ) : (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-zinc-500">Aucun produit publié pour le moment.</p>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold text-zinc-900">{title}</h2>
      {href && (
        <Link href={href} className="text-sm font-medium text-zindo-green-700 hover:underline">
          Voir tout
        </Link>
      )}
    </div>
  );
}

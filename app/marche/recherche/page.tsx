import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { loadMarketProducts, loadPublishedShops } from "@/lib/market-data";
import { getBuyerFavorites } from "@/lib/market-buyer";
import { MARKET_CATEGORIES, MARKET_SORTS, isMarketCategory, marketCategoryLabel, type MarketSort } from "@/lib/market";
import { MarketProductGrid } from "@/components/market/MarketProductCard";
import { ShopChip } from "@/components/market/ShopChip";
import { LocationFilter } from "@/components/market/LocationFilter";
import { locationOptions, matchesLocation } from "@/lib/market-location";
import { getCountry, normalizeSearch } from "@/lib/countries";

export const dynamic = "force-dynamic";

type Params = { q?: string; categorie?: string; promo?: string; stock?: string; min?: string; max?: string; pays?: string; ville?: string; tri?: string; page?: string };

/** Produits ajoutés à chaque « Afficher plus ». */
const STEP = 48;

function toNumber(value: string | undefined): number | undefined {
  const n = Number(String(value ?? "").replace(/\s/g, ""));
  return value && Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Recherche du Marché : texte, catégorie, prix, ville, disponibilité, promotions et tri. */
export default async function MarketSearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const category = params.categorie && isMarketCategory(params.categorie) ? params.categorie : "";
  const sort: MarketSort = MARKET_SORTS.some((s) => s.key === params.tri) ? (params.tri as MarketSort) : "recents";
  const countryFilter = (params.pays ?? "").toUpperCase();
  const cityKey = normalizeSearch(params.ville ?? "");
  const minPrice = toNumber(params.min);
  const maxPrice = toNumber(params.max);

  const shown = STEP * Math.max(1, Math.min(20, Math.floor(Number(params.page) || 1)));
  const allShops = await loadPublishedShops();
  const locations = locationOptions(allShops);
  const shops = countryFilter || cityKey ? allShops.filter((s) => matchesLocation(s, countryFilter, cityKey)) : allShops;
  const cityName = cityKey ? locations.cities[countryFilter]?.find((c) => c.key === cityKey)?.name ?? params.ville : "";

  const [found, favorites] = await Promise.all([
    loadMarketProducts({ shops, q, category, promoOnly: params.promo === "1", inStockOnly: params.stock === "1", minPrice, maxPrice, sort, boostFirst: true, limit: shown + 1 }),
    getBuyerFavorites(),
  ]);
  // Un produit de plus que la page demandée : indique s’il en reste à afficher.
  const hasMore = found.length > shown;
  const products = found.slice(0, shown);
  const term = q.toLowerCase();
  const matchingShops = term ? shops.filter((s) => s.name.toLowerCase().includes(term)) : [];

  const title = q ? `Résultats pour « ${q} »` : category ? marketCategoryLabel(category) : params.promo === "1" ? "Promotions" : "Tous les produits";
  // Changer un filtre ou le tri repart du début de la liste ; seul « Afficher plus » garde la page.
  const hrefWith = (patch: Partial<Params>) => {
    const next = new URLSearchParams(Object.entries({ ...params, page: undefined, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/marche/recherche?${next.toString()}`;
  };
  const activeFilters = [
    category && { label: marketCategoryLabel(category), href: hrefWith({ categorie: undefined }) },
    countryFilter && { label: getCountry(countryFilter).name.fr, href: hrefWith({ pays: undefined, ville: undefined }) },
    cityName && { label: cityName, href: hrefWith({ ville: undefined }) },
    params.promo === "1" && { label: "En promotion", href: hrefWith({ promo: undefined }) },
    params.stock === "1" && { label: "En stock", href: hrefWith({ stock: undefined }) },
    minPrice != null && { label: `Dès ${minPrice.toLocaleString("fr-FR")} F`, href: hrefWith({ min: undefined }) },
    maxPrice != null && { label: `Jusqu'à ${maxPrice.toLocaleString("fr-FR")} F`, href: hrefWith({ max: undefined }) },
  ].filter(Boolean) as { label: string; href: string }[];

  const filters = (
    <form action="/marche/recherche" className="space-y-5 text-sm">
      {q && <input type="hidden" name="q" value={q} />}
      <input type="hidden" name="tri" value={sort} />
      <Fieldset title="Catégorie">
        <select name="categorie" defaultValue={category} className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-2">
          <option value="">Toutes</option>
          {MARKET_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </Fieldset>
      <Fieldset title="Prix">
        <div className="flex items-center gap-2">
          <input name="min" inputMode="numeric" defaultValue={params.min ?? ""} placeholder="Min" className="h-10 w-full rounded-lg border border-zinc-300 px-2" />
          <span className="text-zinc-400">–</span>
          <input name="max" inputMode="numeric" defaultValue={params.max ?? ""} placeholder="Max" className="h-10 w-full rounded-lg border border-zinc-300 px-2" />
        </div>
      </Fieldset>
      {locations.countries.length > 0 && (
        <Fieldset title="Pays et ville">
          <LocationFilter options={locations} country={countryFilter} city={cityKey} />
        </Fieldset>
      )}
      <Fieldset title="Disponibilité">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="stock" value="1" defaultChecked={params.stock === "1"} className="h-4 w-4" /> En stock uniquement
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="promo" value="1" defaultChecked={params.promo === "1"} className="h-4 w-4" /> En promotion
        </label>
      </Fieldset>
      <div className="flex gap-2">
        <button className="h-10 flex-1 rounded-lg bg-zindo-green-600 font-semibold text-white hover:bg-zindo-green-700">Appliquer</button>
        <Link href={q ? `/marche/recherche?q=${encodeURIComponent(q)}` : "/marche/recherche"} className="flex h-10 items-center rounded-lg border border-zinc-300 px-3 text-zinc-700">
          Effacer
        </Link>
      </div>
    </form>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
      <aside className="hidden h-fit rounded-2xl bg-white p-4 ring-1 ring-zinc-200 lg:sticky lg:top-20 lg:block">
        <p className="mb-4 font-bold text-zinc-900">Filtres</p>
        {filters}
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
            <p className="text-sm text-zinc-500">
              {products.length}{hasMore ? "+" : ""} produit{products.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-1.5 overflow-x-auto text-sm">
            {MARKET_SORTS.map((s) => (
              <Link
                key={s.key}
                href={hrefWith({ tri: s.key })}
                className={s.key === sort ? "shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 font-semibold text-white" : "shrink-0 rounded-full bg-white px-3 py-1.5 text-zinc-700 ring-1 ring-zinc-200"}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        <details className="rounded-2xl bg-white ring-1 ring-zinc-200 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm font-semibold text-zinc-800 [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="h-4 w-4" /> Filtres {activeFilters.length > 0 && `(${activeFilters.length})`}
          </summary>
          <div className="border-t border-zinc-100 p-4">{filters}</div>
        </details>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((f) => (
              <Link key={f.label} href={f.href} className="inline-flex items-center gap-1 rounded-full bg-zindo-green-50 px-3 py-1 text-xs font-semibold text-zindo-green-800 ring-1 ring-zindo-green-200">
                {f.label} <X className="h-3 w-3" />
              </Link>
            ))}
          </div>
        )}

        {matchingShops.length > 0 && (
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {matchingShops.map((s) => (
              <ShopChip key={s.slug} shop={s} />
            ))}
          </div>
        )}

        {products.length > 0 ? (
          <>
            <MarketProductGrid products={products} favorites={favorites.listingIds} />
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Link href={hrefWith({ page: String(shown / STEP + 1) })} scroll={false} className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-800 ring-1 ring-zinc-300 hover:bg-zinc-50">
                  Afficher plus de produits
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-zinc-200">
            <p className="font-semibold text-zinc-800">Aucun produit ne correspond</p>
            <p className="mt-1 text-sm text-zinc-500">Essayez un autre mot ou retirez des filtres.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-zinc-500">{title}</legend>
      {children}
    </fieldset>
  );
}

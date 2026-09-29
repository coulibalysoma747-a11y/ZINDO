import Link from "next/link";
import { loadPublishedShops } from "@/lib/market-data";
import { locationOptions, matchesLocation } from "@/lib/market-location";
import { getCountry, normalizeSearch } from "@/lib/countries";
import { ShopCard } from "@/components/market/ShopChip";
import { LocationFilter } from "@/components/market/LocationFilter";

export const dynamic = "force-dynamic";

/** Toutes les boutiques du Marché, filtrables par nom, pays et ville. */
export default async function MarketShopsPage({ searchParams }: { searchParams: Promise<{ q?: string; pays?: string; ville?: string }> }) {
  const params = await searchParams;
  const q = normalizeSearch(params.q ?? "");
  const country = (params.pays ?? "").toUpperCase();
  const cityKey = normalizeSearch(params.ville ?? "");

  const shops = await loadPublishedShops();
  const locations = locationOptions(shops);
  const filtered = shops.filter((s) => matchesLocation(s, country, cityKey) && (!q || normalizeSearch(s.name).includes(q)));
  // Boutiques mises en avant, puis vérifiées, puis les mieux notées.
  const sorted = filtered.sort((a, b) => Number(!!b.boosted) - Number(!!a.boosted) || Number(b.verified) - Number(a.verified) || (b.rating ?? 0) - (a.rating ?? 0));
  const place = [cityKey ? locations.cities[country]?.find((c) => c.key === cityKey)?.name : "", country ? getCountry(country).name.fr : ""].filter(Boolean).join(", ");
  const filtering = !!(q || country || cityKey);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Boutiques{place ? ` · ${place}` : ""}</h1>
        <p className="text-sm text-zinc-500">
          {sorted.length} boutique{sorted.length > 1 ? "s" : ""}
          {filtering ? ` sur ${shops.length}` : " sur le Marché ZINDO"}
        </p>
      </div>

      <form className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 md:grid-cols-[1fr_1fr_auto] md:items-start">
        <input name="q" defaultValue={params.q ?? ""} placeholder="Nom de la boutique…" aria-label="Nom de la boutique" className="h-10 rounded-lg border border-zinc-300 px-3 text-sm" />
        <LocationFilter options={locations} country={country} city={cityKey} />
        <div className="flex gap-2">
          <button className="h-10 flex-1 rounded-lg bg-zindo-green-600 px-4 text-sm font-semibold text-white hover:bg-zindo-green-700">Filtrer</button>
          {filtering && (
            <Link href="/marche/boutiques" className="flex h-10 items-center rounded-lg border border-zinc-300 px-3 text-sm text-zinc-700">
              Effacer
            </Link>
          )}
        </div>
      </form>

      {sorted.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sorted.map((s) => (
            <ShopCard key={s.slug} shop={s} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-zinc-500 ring-1 ring-zinc-200">{filtering ? "Aucune boutique ne correspond à ces filtres." : "Aucune boutique pour le moment."}</p>
      )}
    </div>
  );
}

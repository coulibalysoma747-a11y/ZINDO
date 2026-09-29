import { getCountry, normalizeSearch } from "@/lib/countries";

/** Ville présentable : « NIANGOLOKO » ou « niangoloko » deviennent « Niangoloko ». */
export function displayCity(city: string): string {
  const trimmed = city.trim();
  if (trimmed !== trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase()) return trimmed;
  return trimmed.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());
}

export type LocationOptions = {
  countries: { code: string; name: string; count: number }[];
  /** Villes par pays (code ISO), triées par nom. */
  cities: Record<string, { key: string; name: string; count: number }[]>;
};

/** Pays et villes réellement présents parmi ces boutiques (pour les filtres du Marché). */
export function locationOptions(shops: { countryCode?: string; city: string | null }[]): LocationOptions {
  const countries = new Map<string, number>();
  const cities: Record<string, Map<string, { name: string; count: number }>> = {};
  for (const shop of shops) {
    const code = shop.countryCode ?? "BF";
    countries.set(code, (countries.get(code) ?? 0) + 1);
    if (!shop.city?.trim()) continue;
    const key = normalizeSearch(shop.city);
    const byCity = (cities[code] ??= new Map());
    const current = byCity.get(key);
    byCity.set(key, { name: current?.name ?? displayCity(shop.city), count: (current?.count ?? 0) + 1 });
  }
  return {
    countries: [...countries.entries()].map(([code, count]) => ({ code, name: getCountry(code).name.fr, count })).sort((a, b) => a.name.localeCompare(b.name, "fr")),
    cities: Object.fromEntries(
      Object.entries(cities).map(([code, map]) => [code, [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => a.name.localeCompare(b.name, "fr"))])
    ),
  };
}

/** La boutique correspond-elle au pays et à la ville choisis (ville sans accents ni majuscules) ? */
export function matchesLocation(shop: { countryCode?: string; city: string | null }, country: string, cityKey: string): boolean {
  if (country && (shop.countryCode ?? "BF") !== country) return false;
  if (cityKey && normalizeSearch(shop.city ?? "") !== cityKey) return false;
  return true;
}

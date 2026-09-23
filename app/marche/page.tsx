import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Search, Store } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabled, isFeatureEnabledGlobally, registerFeatureFlag } from "@/lib/feature-flags";
import { formatMoney } from "@/lib/format";
import { ZindoLogo } from "@/components/auth/ZindoLogo";

/**
 * Place de marché ZINDO (étape 1) : catalogue commun de toutes les boutiques
 * en ligne publiées. La commande se fait ensuite sur la vitrine du commerçant
 * (/boutique/[slug]). Désactivée par défaut : visible seulement une fois
 * « Place de marché ZINDO » activé globalement depuis /admin/fonctionnalites.
 */
const MARKETPLACE_FLAG = "marche_zindo";
const MAX_RESULTS = 240;

export const metadata: Metadata = {
  title: "Marché ZINDO — achetez chez les commerces du Burkina Faso",
  description: "Trouvez les produits des boutiques ZINDO près de chez vous et commandez en ligne.",
};

type StoreRow = {
  slug: string;
  storeName: string;
  city: string | null;
  locationId: string | null;
  businessId: string;
  showOutOfStock: boolean;
  business: { currency: string };
};

type StockRow = {
  locationId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    salePrice: number;
    photoUrl: string | null;
    active: boolean;
    category: { name: string } | null;
  };
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ville?: string; categorie?: string }>;
}) {
  await registerFeatureFlag(
    MARKETPLACE_FLAG,
    "Place de marché ZINDO",
    "Page publique /marche qui rassemble les produits de toutes les boutiques en ligne publiées. À activer globalement."
  );
  if (!(await isFeatureEnabledGlobally(MARKETPLACE_FLAG))) notFound();

  const { q = "", ville = "", categorie = "" } = await searchParams;

  const { data: storesData } = await supabase
    .from("online_stores")
    .select(
      "slug, storeName:store_name, city, locationId:location_id, businessId:business_id, showOutOfStock:show_out_of_stock, business:businesses(currency)"
    )
    .eq("published", true)
    .not("location_id", "is", null);
  const allStores = (storesData ?? []) as unknown as StoreRow[];

  // Même condition que la vitrine : le module boutique en ligne doit être actif pour le commerce.
  const enabled = await Promise.all(allStores.map((s) => isFeatureEnabled("boutique_en_ligne", s.businessId)));
  const stores = allStores.filter((_, i) => enabled[i]);
  const storeByLocation = new Map(stores.map((s) => [s.locationId as string, s]));

  const { data: stocksData } = stores.length
    ? await supabase
        .from("product_stocks")
        .select(
          "locationId:location_id, quantity, product:products!inner(id, name, salePrice:sale_price, photoUrl:photo_url, active, category:categories(name))"
        )
        .in("location_id", [...storeByLocation.keys()])
    : { data: [] };

  const offers = ((stocksData ?? []) as unknown as StockRow[])
    .map((s) => ({ ...s, store: storeByLocation.get(s.locationId)! }))
    .filter((s) => s.store && s.product.active && (s.quantity > 0 || s.store.showOutOfStock));

  const cities = [...new Set(stores.map((s) => s.city?.trim()).filter((c): c is string => !!c))].sort();
  const categories = [
    ...new Set(offers.map((o) => o.product.category?.name).filter((c): c is string => !!c)),
  ].sort();

  const needle = normalize(q.trim());
  const results = offers
    .filter((o) => !needle || normalize(o.product.name).includes(needle) || normalize(o.store.storeName).includes(needle))
    .filter((o) => !ville || o.store.city?.trim() === ville)
    .filter((o) => !categorie || o.product.category?.name === categorie)
    .sort((a, b) => a.product.name.localeCompare(b.product.name));
  const shown = results.slice(0, MAX_RESULTS);

  return (
    <div className="theme-locked min-h-screen bg-zinc-50">
      <header className="bg-zindo-ink-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link href="/marche" className="flex items-center gap-2.5">
            <ZindoLogo size={34} />
            <span className="text-lg font-extrabold tracking-tight">
              Marché <span className="text-zindo-green-400">ZINDO</span>
            </span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-zinc-300 hover:text-white">
            Vous êtes commerçant ?
          </Link>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-2 sm:px-8">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Achetez chez les commerces près de chez vous</h1>
          <p className="mt-1 text-sm text-zinc-300">
            {stores.length} boutique{stores.length > 1 ? "s" : ""} · {offers.length} produit{offers.length > 1 ? "s" : ""}
          </p>
          <form method="get" className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <label className="flex items-center gap-2 rounded-xl bg-white px-3 text-zindo-ink-900">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Rechercher un produit ou une boutique…"
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </label>
            <select name="ville" defaultValue={ville} className="rounded-xl bg-white px-3 py-3 text-sm text-zindo-ink-900">
              <option value="">Toutes les villes</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select name="categorie" defaultValue={categorie} className="rounded-xl bg-white px-3 py-3 text-sm text-zindo-ink-900">
              <option value="">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-xl bg-zindo-green-500 px-5 py-3 text-sm font-bold text-white hover:bg-zindo-green-600">
              Rechercher
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {shown.length === 0 ? (
          <p className="py-16 text-center text-zinc-500">Aucun produit ne correspond à votre recherche.</p>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map((o) => (
                <li key={`${o.store.slug}-${o.product.id}`}>
                  <Link
                    href={`/boutique/${o.store.slug}`}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex aspect-square items-center justify-center bg-zinc-100">
                      {o.product.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={o.product.photoUrl} alt={o.product.name} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <Store className="h-10 w-10 text-zinc-300" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <p className="line-clamp-2 text-sm font-semibold text-zindo-ink-900">{o.product.name}</p>
                      <p className="mt-1 text-base font-extrabold text-zindo-green-600">
                        {formatMoney(o.product.salePrice, o.store.business.currency)}
                      </p>
                      <p className="mt-auto pt-2 text-xs text-zinc-500">
                        {o.store.storeName}
                        {o.store.city && (
                          <span className="ml-1 inline-flex items-center gap-0.5">
                            · <MapPin className="h-3 w-3" /> {o.store.city}
                          </span>
                        )}
                      </p>
                      {o.quantity <= 0 && <p className="mt-1 text-xs font-semibold text-red-600">Rupture de stock</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {results.length > shown.length && (
              <p className="mt-6 text-center text-sm text-zinc-500">
                {results.length - shown.length} autres produits : affinez votre recherche.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

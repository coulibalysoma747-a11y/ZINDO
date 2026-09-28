import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ChevronRight, Clock, MapPin, MessageCircle, Phone, Store, Truck } from "lucide-react";
import { loadListingPhotos, loadMarketProducts, loadPublishedShops, loadReviews, recordMarketView } from "@/lib/market-data";
import { getBuyerFavorites, getCurrentBuyer } from "@/lib/market-buyer";
import { discountPercent, marketCategoryLabel } from "@/lib/market";
import { formatMoney, formatDateTime } from "@/lib/format";
import { MarketProductRow } from "@/components/market/MarketProductCard";
import { ShopLogo } from "@/components/market/ShopChip";
import { AddToCart } from "@/components/market/AddToCart";
import { FavoriteButton } from "@/components/market/FavoriteButton";
import { ProductGallery } from "@/components/market/ProductGallery";
import { ReportButton } from "@/components/market/ReportButton";
import { ShareButton } from "@/components/market/ShareButton";
import { StarRow, Stars } from "@/components/market/Stars";

export const dynamic = "force-dynamic";

function whatsappLink(number: string, text: string) {
  const digits = number.replace(/\D/g, "");
  // Numéro local burkinabè à 8 chiffres : on ajoute l'indicatif 226.
  return `https://wa.me/${digits.length === 8 ? `226${digits}` : digits}?text=${encodeURIComponent(text)}`;
}

export default async function MarketProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shops = await loadPublishedShops();
  const [product] = await loadMarketProducts({ shops, productId: id, limit: 1 });
  if (!product) notFound();
  const shop = shops.find((s) => s.slug === product.shop.slug)!;

  const [extraPhotos, reviews, similarAll, favorites, buyer] = await Promise.all([
    loadListingPhotos(product.listingId),
    loadReviews({ productId: product.productId }, 10),
    loadMarketProducts({ shops, category: product.category, sort: "populaires", limit: 11 }),
    getBuyerFavorites(),
    getCurrentBuyer(),
    recordMarketView({ listingId: product.listingId }),
  ]);
  const similar = similarAll.filter((p) => p.productId !== product.productId).slice(0, 10);
  const photos = [product.photoUrl!, ...extraPhotos];
  const discount = discountPercent(product.price, product.promoPrice);
  const inStock = product.available > 0;
  const loginToContact = `/marche/compte?suite=${encodeURIComponent(`/marche/produit/${product.productId}`)}`;

  return (
    <div className="space-y-10">
      <nav className="flex items-center gap-1 text-xs text-zinc-500">
        <Link href="/marche" className="hover:underline">Marché</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/marche/recherche?categorie=${product.category}`} className="hover:underline">{marketCategoryLabel(product.category)}</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-zinc-700">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <ProductGallery
          photos={photos}
          alt={product.name}
          badge={discount != null ? <span className="absolute left-3 top-3 rounded-lg bg-red-600 px-3 py-1 text-sm font-bold text-white shadow">-{discount} %</span> : null}
        />

        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              {product.brand && <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{product.brand}</p>}
              <h1 className="text-2xl font-bold leading-tight text-zinc-900">{product.name}</h1>
              <Stars rating={product.rating} count={product.reviewCount} size="md" />
            </div>
            <div className="flex shrink-0 gap-2">
              <ShareButton title={product.name} />
              <FavoriteButton listingId={product.listingId} initial={favorites.listingIds.has(product.listingId)} />
            </div>
          </div>

          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-extrabold text-zinc-900">{formatMoney(product.promoPrice ?? product.price)}</span>
            {product.promoPrice != null && <span className="text-lg text-zinc-400 line-through">{formatMoney(product.price)}</span>}
            <span className={inStock ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"}>
              {inStock ? `En stock · ${product.available} ${product.unit}` : "Rupture de stock"}
            </span>
          </div>

          <AddToCart productId={product.productId} available={product.available} />

          <div className="divide-y divide-zinc-100 rounded-2xl bg-white ring-1 ring-zinc-200">
            {shop.deliveryEnabled && (
              <InfoRow icon={Truck} title={`Livraison ${shop.deliveryFee > 0 ? formatMoney(shop.deliveryFee) : "gratuite"}`} text={shop.deliveryNote ?? "Délai à confirmer avec le vendeur"} />
            )}
            {shop.pickupEnabled && <InfoRow icon={Store} title="Retrait en boutique" text={[shop.address, shop.city].filter(Boolean).join(", ") || "À la boutique du vendeur"} />}
            {shop.hours && <InfoRow icon={Clock} title="Horaires" text={shop.hours} />}
          </div>

          {/* Vendeur */}
          <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200">
            <Link href={`/marche/boutique/${shop.slug}`} className="flex items-center gap-3">
              <ShopLogo shop={shop} size={48} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 font-semibold text-zinc-900">
                  <span className="truncate">{shop.name}</span>
                  {shop.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-600" aria-label="Vendeur vérifié" />}
                </p>
                <Stars rating={shop.rating} count={shop.reviewCount} />
                {shop.city && (
                  <p className="flex items-center gap-1 text-xs text-zinc-500">
                    <MapPin className="h-3 w-3" /> {shop.city}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </Link>
            {buyer ? (
              <div className="flex gap-2">
                {shop.whatsapp && (
                  <a
                    href={whatsappLink(shop.whatsapp, `Bonjour, je suis intéressé(e) par « ${product.name} » vu sur le Marché ZINDO.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white hover:opacity-90"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
                {shop.phone && (
                  <a href={`tel:${shop.phone}`} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                    <Phone className="h-4 w-4" /> Appeler
                  </a>
                )}
              </div>
            ) : (
              <Link href={loginToContact} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                <MessageCircle className="h-4 w-4" /> Contacter le vendeur
              </Link>
            )}
          </div>

          <ReportButton listingId={product.listingId} label="Signaler ce produit" />
        </div>
      </div>

      {product.description && (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
          <h2 className="mb-2 text-lg font-bold text-zinc-900">Description</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">{product.description}</p>
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-zinc-900">Avis des clients</h2>
          <Stars rating={product.rating} count={product.reviewCount} size="md" />
        </div>
        {reviews.length === 0 ? (
          <p className="text-sm text-zinc-500">Pas encore d&apos;avis. Les clients peuvent noter le produit après la livraison.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {reviews.map((r) => (
              <li key={r.id} className="space-y-1 py-3">
                <div className="flex items-center gap-2">
                  <StarRow rating={r.rating} />
                  <span className="text-sm font-semibold text-zinc-800">{r.buyerName}</span>
                  <span className="text-xs text-zinc-400">{formatDateTime(r.createdAt)}</span>
                </div>
                {r.comment && <p className="text-sm text-zinc-700">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {similar.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-zinc-900">Produits similaires</h2>
          <MarketProductRow products={similar} favorites={favorites.listingIds} />
        </section>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, title, text }: { icon: typeof Truck; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 p-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-700" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        <p className="text-xs text-zinc-500">{text}</p>
      </div>
    </div>
  );
}

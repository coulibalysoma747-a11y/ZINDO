"use client";

import { Package } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { EmptyState } from "@/components/ui/Empty";
import { ProductCardMenu } from "@/components/products/ProductCardMenu";
import type { PackagingUnitOption } from "@/lib/actions/product-search";
import type { PriceTierOption } from "@/lib/pricing";

export type { PackagingUnitOption };

export type PosProduct = {
  id: string;
  name: string;
  reference: string;
  barcode: string | null;
  photoUrl: string | null;
  salePrice: number;
  purchasePrice: number;
  quantity: number;
  unit: string;
  trackUnits: boolean;
  packagingUnits?: PackagingUnitOption[];
  /** Paliers de prix ("prix de gros" — grossiste/dépôt/quincaillerie), voir lib/pricing.ts. */
  priceTiers?: PriceTierOption[];
  /** Date du lot le plus proche de péremption (module Péremption, pharmacie/supermarché) — voir lib/actions/expiry.ts::getNearestExpiryByProduct. */
  nearestExpiry?: string | null;
};

const EXPIRY_WARNING_DAYS = 60;

function formatExpiryBadge(dateStr: string): { label: string; urgent: boolean } {
  const date = new Date(dateStr);
  const daysLeft = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return {
    label: `Lot : ${date.toLocaleDateString("fr-FR")}`,
    urgent: daysLeft <= EXPIRY_WARNING_DAYS,
  };
}

export function ProductGrid({
  products,
  onSelect,
  currency = "XOF",
  canEditProducts = false,
}: {
  products: PosProduct[];
  onSelect: (product: PosProduct, packaging?: PackagingUnitOption) => void;
  currency?: string;
  canEditProducts?: boolean;
}) {
  if (products.length === 0) {
    return <EmptyState title="Aucun produit trouvé" description="Modifiez votre recherche ou vérifiez le stock de cette boutique." />;
  }

  return (
    // Colonnes selon la place réellement disponible (requêtes de conteneur),
    // pas selon la largeur de l'écran : à la caisse sur ordinateur, la grille
    // partage l'écran avec la colonne panier/paiement.
    <div className="@container">
    <div className="grid grid-cols-2 gap-3 @md:grid-cols-3 @2xl:grid-cols-4 @4xl:grid-cols-5 @6xl:grid-cols-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="group relative flex flex-col rounded-2xl border border-zinc-200/80 bg-white text-left shadow-sm shadow-zinc-900/[0.02] transition-all hover:-translate-y-0.5 hover:border-zindo-green-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <button
            type="button"
            onClick={() => onSelect(product)}
            aria-label={`Ajouter ${product.name} au panier`}
            className="absolute inset-0 z-0 rounded-2xl active:scale-[0.98]"
          />
          <div className="pointer-events-none relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-zinc-50 dark:bg-slate-800">
            {product.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.photoUrl}
                alt={product.name}
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-8 w-8 text-zinc-300" />
              </div>
            )}
            <span className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 shadow-sm">
              {product.quantity} {product.unit}
            </span>
          </div>
          <div className="absolute left-1.5 top-1.5 z-10">
            <ProductCardMenu productId={product.id} canEdit={canEditProducts} />
          </div>
          <div className="pointer-events-none flex flex-1 flex-col gap-0.5 p-2.5">
            <p className="break-words text-sm font-medium leading-snug text-zinc-900" title={product.name}>
              {product.name}
            </p>
            <p className="truncate text-[11px] text-zinc-400">{product.reference}</p>
            <p className="mt-auto pt-1 text-sm font-bold text-emerald-600">
              {formatMoney(product.salePrice, currency)}
            </p>
            {product.priceTiers && product.priceTiers.length > 0 && (
              <p className="text-[10px] font-medium text-zindo-green-700">
                Dès {Math.min(...product.priceTiers.map((t) => t.minQuantity))} {product.unit} :{" "}
                {formatMoney(Math.min(...product.priceTiers.map((t) => t.unitPrice)), currency)}
              </p>
            )}
            {product.nearestExpiry && (
              <p
                className={`text-[10px] font-medium ${
                  formatExpiryBadge(product.nearestExpiry).urgent ? "text-amber-600" : "text-zinc-400"
                }`}
              >
                {formatExpiryBadge(product.nearestExpiry).label}
              </p>
            )}
            {product.packagingUnits && product.packagingUnits.length > 0 && (
              <div className="pointer-events-auto relative z-10 -mx-0.5 mt-1 flex flex-wrap gap-1">
                {product.packagingUnits.map((pu) => (
                  <button
                    key={pu.id}
                    type="button"
                    onClick={() => onSelect(product, pu)}
                    className="rounded-md border border-zindo-green-200 bg-zindo-green-50 px-1.5 py-0.5 text-[10px] font-medium text-zindo-green-700 hover:bg-zindo-green-100"
                  >
                    {pu.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
    </div>
  );
}

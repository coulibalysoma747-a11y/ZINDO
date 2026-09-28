"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { bulkMarketListingAction } from "@/lib/actions/market";
import { MARKET_CATEGORIES } from "@/lib/market";
import { PublishToMarket } from "../PublishToMarket";
import { ListingPhotos } from "./ListingPhotos";

export type ProductRow = {
  id: string;
  name: string;
  reference: string;
  priceLabel: string;
  salePrice: number;
  photoUrl: string | null;
  available: number;
  listing: { id: string; category: string; promoPrice: number | null; published: boolean; viewCount: number; removedByAdmin: boolean; removedReason: string | null } | null;
  photos: { id: string; url: string }[];
};

/** Liste des produits du stock avec sélection multiple (publier / retirer plusieurs produits d'un coup). */
export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState<{ error?: string; success?: string }>();
  const [pending, startTransition] = useTransition();
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function run(publish: boolean) {
    startTransition(async () => {
      const result = await bulkMarketListingAction({ productIds: [...selected], category: category || undefined, publish });
      setMessage(result);
      if (!result.error) {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200">
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
            className="h-4 w-4"
            aria-label="Tout sélectionner sur cette page"
          />
          {selected.size > 0 ? `${selected.size} sélectionné${selected.size > 1 ? "s" : ""}` : "Tout sélectionner"}
        </label>
        {selected.size > 0 && (
          <>
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie du Marché" className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm">
              <option value="">Catégorie du Marché…</option>
              {MARKET_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <button type="button" disabled={pending} onClick={() => run(true)} className="h-9 rounded-lg bg-zindo-green-600 px-3 text-sm font-semibold text-white disabled:opacity-50">
              Publier la sélection
            </button>
            <button type="button" disabled={pending} onClick={() => run(false)} className="h-9 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 disabled:opacity-50">
              Retirer du Marché
            </button>
          </>
        )}
        {message?.error && <p className="w-full text-sm text-red-600">{message.error}</p>}
        {message?.success && <p className="w-full text-sm text-emerald-700">{message.success}</p>}
      </div>

      <div className="divide-y divide-zinc-100">
        {rows.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">Aucun produit.</p>}
        {rows.map((p) => (
          <div key={p.id} className={`space-y-2 p-4 ${selected.has(p.id) ? "bg-zindo-green-50/50" : ""}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 shrink-0" aria-label={`Sélectionner ${p.name}`} />
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photoUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-zinc-200" />
                ) : (
                  <Link href={`/produits/${p.id}/modifier`} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 text-center text-[10px] font-semibold leading-tight text-amber-800">
                    Ajouter
                    <br />
                    photo
                  </Link>
                )}
                <div className="min-w-0">
                  <Link href={`/produits/${p.id}`} className="block truncate text-sm font-semibold text-zinc-900 hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {p.reference} · {p.priceLabel} · {p.available > 0 ? `${p.available} en stock` : <span className="font-semibold text-red-600">Rupture</span>}
                  </p>
                  {p.listing?.published && (
                    <p className="flex items-center gap-1 text-xs text-zinc-500">
                      <Eye className="h-3.5 w-3.5" /> {p.listing.viewCount} vue{p.listing.viewCount > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
              <PublishToMarket productId={p.id} salePrice={p.salePrice} initial={p.listing} hasPhoto={!!p.photoUrl?.trim()} compact />
            </div>
            {p.listing?.removedByAdmin && (
              <p className="rounded-lg bg-red-50 p-2 text-xs text-red-800">Retiré du Marché par ZINDO{p.listing.removedReason ? ` : ${p.listing.removedReason}` : ""}.</p>
            )}
            {p.listing?.published && <ListingPhotos listingId={p.listing.id} photos={p.photos} />}
          </div>
        ))}
      </div>
    </div>
  );
}

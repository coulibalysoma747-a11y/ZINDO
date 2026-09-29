"use client";

import { useState, useTransition } from "react";
import { Store } from "lucide-react";
import { saveMarketListingAction } from "@/lib/actions/market";
import { MARKET_CATEGORIES } from "@/lib/market";

/**
 * « Publier dans mon Marché » pour un produit du stock : catégorie du Marché,
 * prix promotionnel facultatif, publication. Utilisé dans Mon Marché et sur
 * la fiche produit.
 */
export function PublishToMarket({
  productId,
  salePrice,
  initial,
  hasPhoto,
  compact = false,
}: {
  productId: string;
  salePrice: number;
  hasPhoto: boolean;
  initial: { category: string; promoPrice: number | null; published: boolean } | null;
  compact?: boolean;
}) {
  const [category, setCategory] = useState(initial?.category ?? "");
  const [promo, setPromo] = useState(initial?.promoPrice != null ? String(initial.promoPrice) : "");
  const [published, setPublished] = useState(initial?.published ?? false);
  const [message, setMessage] = useState<{ error?: string; success?: string } | undefined>();
  const [pending, startTransition] = useTransition();

  function save(nextPublished: boolean) {
    // Virgule ou point acceptés (« 12,50 » comme « 12.50 »).
    const promoPrice = promo.trim() ? Number(promo.replace(/\s/g, "").replace(",", ".")) : null;
    if (promoPrice != null && (!Number.isFinite(promoPrice) || promoPrice <= 0)) {
      setMessage({ error: "Prix promotionnel invalide." });
      return;
    }
    if (promoPrice != null && promoPrice >= salePrice) {
      setMessage({ error: "Le prix promotionnel doit être inférieur au prix de vente." });
      return;
    }
    if (!category) {
      setMessage({ error: "Choisissez une catégorie du Marché." });
      return;
    }
    startTransition(async () => {
      const result = await saveMarketListingAction({ productId, category, promoPrice, published: nextPublished });
      setMessage(result);
      if (!result?.error) setPublished(nextPublished);
    });
  }

  if (!hasPhoto && !published) {
    return (
      <p className={compact ? "text-xs text-amber-700" : "rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"}>
        Ajoutez une photo au produit pour pouvoir le publier sur le Marché.{" "}
        <a href={`/produits/${productId}/modifier`} className="font-semibold underline">
          Ajouter une photo
        </a>
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3 rounded-xl border border-zinc-200 p-3"}>
      {!compact && (
        <p className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
          <Store className="h-4 w-4 text-zindo-green-600" />
          Marché ZINDO
          {published && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Publié</span>}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Catégorie du Marché"
          className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm"
        >
          <option value="">Catégorie…</option>
          {MARKET_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          value={promo}
          onChange={(e) => setPromo(e.target.value)}
          inputMode="decimal"
          placeholder="Prix promo (facultatif)"
          aria-label="Prix promotionnel"
          className="h-9 w-40 rounded-lg border border-zinc-300 px-2 text-sm"
        />
        {published ? (
          <>
            <button type="button" disabled={pending} onClick={() => save(true)} className="h-9 rounded-lg border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50">
              Mettre à jour
            </button>
            <button type="button" disabled={pending} onClick={() => save(false)} className="h-9 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
              Retirer
            </button>
          </>
        ) : (
          <button type="button" disabled={pending} onClick={() => save(true)} className="h-9 rounded-lg bg-zindo-green-600 px-3 text-sm font-semibold text-white hover:bg-zindo-green-700 disabled:opacity-50">
            Publier dans mon Marché
          </button>
        )}
      </div>
      {message?.error && <p className="text-xs text-red-600">{message.error}</p>}
      {message?.success && <p className="text-xs text-emerald-700">{message.success}</p>}
    </div>
  );
}

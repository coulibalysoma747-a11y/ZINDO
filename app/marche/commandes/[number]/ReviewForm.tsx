"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { submitReviewAction } from "@/lib/actions/market-social";

/** Note (1 à 5) et commentaire sur un produit d'une commande livrée. */
export function ReviewForm({ orderId, productId, initial }: { orderId: string; productId: string; initial: { rating: number; comment: string | null } | null }) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [message, setMessage] = useState<{ error?: string; success?: string }>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2 rounded-xl bg-zinc-50 p-3">
      <div className="flex items-center gap-1" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={rating === i} aria-label={`${i} sur 5`} onClick={() => setRating(i)}>
            <Star className={`h-7 w-7 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Votre avis sur ce produit (facultatif)"
        className="w-full rounded-lg border border-zinc-300 bg-white p-2 text-sm"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setMessage(await submitReviewAction({ orderId, productId, rating, comment: comment || undefined })))}
        className="h-9 rounded-lg bg-zindo-green-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {initial ? "Modifier mon avis" : "Publier mon avis"}
      </button>
      {message?.error && <p className="text-xs text-red-600">{message.error}</p>}
      {message?.success && <p className="text-xs text-emerald-700">{message.success}</p>}
    </div>
  );
}

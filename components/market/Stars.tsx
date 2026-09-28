import { Star } from "lucide-react";

/** Note moyenne en étoiles (ex. ★ 4,6 (128 avis)). */
export function Stars({ rating, count, size = "sm" }: { rating: number | null; count: number; size?: "sm" | "md" }) {
  if (rating == null || count === 0) return null;
  const icon = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <span className={`inline-flex items-center gap-1 ${size === "md" ? "text-sm" : "text-xs"} text-zinc-600`}>
      <Star className={`${icon} fill-amber-400 text-amber-400`} />
      <span className="font-semibold text-zinc-800">{rating.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
      <span>({count} avis)</span>
    </span>
  );
}

/** Rangée de 5 étoiles pleines ou vides (avis individuel). */
export function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
      ))}
    </span>
  );
}

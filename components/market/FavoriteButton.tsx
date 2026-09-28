"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "@/lib/actions/market-social";

/** Cœur « favori » d'un produit (listingId) ou bouton « Suivre » d'une boutique (shopId). */
export function FavoriteButton({
  listingId,
  shopId,
  initial,
  variant = "icon",
}: {
  listingId?: string;
  shopId?: string;
  initial: boolean;
  variant?: "icon" | "follow";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [favorite, setFavorite] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle(e: React.MouseEvent) {
    // Le cœur est posé sur une carte cliquable : on ne suit pas le lien.
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await toggleFavoriteAction({ listingId, shopId });
      if (result.needsLogin) {
        router.push(`/marche/compte?suite=${encodeURIComponent(pathname)}`);
        return;
      }
      if (typeof result.favorite === "boolean") setFavorite(result.favorite);
    });
  }

  if (variant === "follow") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={
          favorite
            ? "inline-flex h-10 items-center gap-2 rounded-xl border border-zindo-green-600 bg-zindo-green-50 px-4 text-sm font-semibold text-zindo-green-800"
            : "inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
        }
      >
        <Heart className={`h-4 w-4 ${favorite ? "fill-zindo-green-600 text-zindo-green-600" : ""}`} />
        {favorite ? "Boutique suivie" : "Suivre"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={favorite}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-zinc-200 transition hover:scale-105"
    >
      <Heart className={`h-[18px] w-[18px] ${favorite ? "fill-red-500 text-red-500" : "text-zinc-600"}`} />
    </button>
  );
}

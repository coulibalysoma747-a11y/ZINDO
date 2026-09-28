"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { addToCart } from "./cart-store";

/** « + » d'une carte produit : ajoute une unité au panier sans quitter la page. */
export function QuickAddButton({ productId, disabled }: { productId: string; disabled: boolean }) {
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label="Ajouter au panier"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(productId, 1);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zindo-green-600 text-white shadow-sm transition hover:bg-zindo-green-700 disabled:bg-zinc-300"
    >
      {added ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
    </button>
  );
}

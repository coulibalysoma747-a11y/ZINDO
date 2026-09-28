"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { addToCart } from "./cart-store";

export function AddToCart({ productId, available }: { productId: string; available: number }) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  if (available <= 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-zinc-700">Quantité</span>
        <div className="flex items-center rounded-xl border border-zinc-300 bg-white">
          <button type="button" aria-label="Moins" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-10 w-10 items-center justify-center">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center font-semibold">{quantity}</span>
          <button type="button" aria-label="Plus" onClick={() => setQuantity((q) => Math.min(available, q + 1))} className="flex h-10 w-10 items-center justify-center">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            addToCart(productId, quantity);
            setAdded(true);
          }}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-zindo-green-600 bg-white font-semibold text-zindo-green-700 hover:bg-zindo-green-50"
        >
          <ShoppingCart className="h-5 w-5" /> Ajouter au panier
        </button>
        <button
          type="button"
          onClick={() => {
            addToCart(productId, quantity);
            router.push("/marche/panier");
          }}
          className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-zindo-green-600 font-semibold text-white hover:bg-zindo-green-700"
        >
          Commander maintenant
        </button>
      </div>
      {added && (
        <p className="text-sm text-emerald-700">
          Ajouté au panier.{" "}
          <button type="button" onClick={() => router.push("/marche/panier")} className="font-semibold underline">
            Voir le panier
          </button>
        </p>
      )}
    </div>
  );
}

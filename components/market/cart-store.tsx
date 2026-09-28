"use client";

import { useEffect, useState } from "react";

/**
 * Panier du Marché, gardé dans le navigateur du client (aucun compte requis
 * pour le remplir). Les prix et le stock sont toujours relus sur le serveur.
 */

export type StoredCartLine = { productId: string; quantity: number };

const KEY = "zindo_marche_panier";
const EVENT = "zindo-marche-panier";

export function readCart(): StoredCartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((l) => typeof l?.productId === "string" && Number(l.quantity) > 0) : [];
  } catch {
    return [];
  }
}

export function writeCart(lines: StoredCartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // Stockage indisponible (navigation privée) : le panier reste en mémoire le temps de la page.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function addToCart(productId: string, quantity: number) {
  const lines = readCart();
  const line = lines.find((l) => l.productId === productId);
  if (line) line.quantity += quantity;
  else lines.push({ productId, quantity });
  writeCart(lines);
}

export function setCartQuantity(productId: string, quantity: number) {
  writeCart(
    readCart()
      .map((l) => (l.productId === productId ? { ...l, quantity } : l))
      .filter((l) => l.quantity > 0)
  );
}

/** Contenu du panier, mis à jour dès qu'il change (même page ou autre onglet). */
export function useCart(): StoredCartLine[] {
  const [lines, setLines] = useState<StoredCartLine[]>([]);
  useEffect(() => {
    const update = () => setLines(readCart());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return lines;
}

export function CartCount() {
  const count = useCart().reduce((sum, l) => sum + l.quantity, 0);
  if (count === 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4 text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

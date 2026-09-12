"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreVertical, Pencil, Eye, Tag } from "lucide-react";

export function ProductRowMenu({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <Link
            href={`/produits/${productId}/modifier`}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Link>
          <Link
            href={`/produits/${productId}`}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <Eye className="h-3.5 w-3.5" /> Voir la fiche
          </Link>
          <Link
            href={`/produits/${productId}/etiquette`}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <Tag className="h-3.5 w-3.5" /> Imprimer étiquette
          </Link>
        </div>
      )}
    </div>
  );
}

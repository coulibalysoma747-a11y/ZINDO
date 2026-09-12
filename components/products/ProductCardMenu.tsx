"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreVertical, Pencil, Tag } from "lucide-react";

export function ProductCardMenu({ productId, canEdit }: { productId: string; canEdit: boolean }) {
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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Actions produit"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-zinc-900"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 text-left shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {canEdit && (
            <Link
              href={`/produits/${productId}/modifier`}
              role="menuitem"
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Modifier
            </Link>
          )}
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

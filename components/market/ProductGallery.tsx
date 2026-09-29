"use client";
import { vignette } from "@/lib/vignette";

import { useState } from "react";

/** Grande photo + vignettes (photo principale du produit puis photos ajoutées sur le Marché). */
export function ProductGallery({ photos, alt, badge }: { photos: string[]; alt: string; badge?: React.ReactNode }) {
  const [current, setCurrent] = useState(0);
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[current]} alt={alt} className="h-full w-full object-contain" />
        {badge}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Photo ${i + 1}`}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ${i === current ? "ring-zindo-green-600" : "ring-transparent opacity-70 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={vignette(url, 64)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

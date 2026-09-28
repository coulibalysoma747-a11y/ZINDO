"use client";

import { useState, useTransition } from "react";
import { ImagePlus, X } from "lucide-react";
import { uploadImageDirect } from "@/components/ui/direct-upload";
import { addListingPhotoAction, removeListingPhotoAction } from "@/lib/actions/market";
import { MAX_LISTING_PHOTOS } from "@/lib/market";

/** Photos supplémentaires d'un produit publié (galerie de la fiche produit du Marché). */
export function ListingPhotos({ listingId, photos: initial }: { listingId: string; photos: { id: string; url: string }[] }) {
  const [photos, setPhotos] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].slice(0, MAX_LISTING_PHOTOS - photos.length);
    e.target.value = "";
    if (files.length === 0) return;
    setError(undefined);
    startTransition(async () => {
      for (const file of files) {
        try {
          const url = await uploadImageDirect(file, "marche");
          const result = await addListingPhotoAction(listingId, url);
          if (result.error) throw new Error(result.error);
          setPhotos((prev) => [...prev, { id: result.id!, url }]);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Échec de l'envoi");
          return;
        }
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeListingPhotoAction(id);
      if (result.error) return setError(result.error);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pl-[4.25rem]">
      {photos.map((p) => (
        <span key={p.id} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt="" className="h-12 w-12 rounded-lg object-cover ring-1 ring-zinc-200" />
          <button
            type="button"
            aria-label="Retirer la photo"
            disabled={pending}
            onClick={() => remove(p.id)}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {photos.length < MAX_LISTING_PHOTOS && (
        <label className="flex h-12 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50">
          <ImagePlus className="h-4 w-4" /> {pending ? "Envoi…" : "Autres photos"}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={add} disabled={pending} />
        </label>
      )}
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}

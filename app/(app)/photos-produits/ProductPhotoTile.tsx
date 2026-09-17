"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { updateProductPhotoAction } from "@/lib/actions/products";

export function ProductPhotoTile({ productId, name, photoUrl: initialPhotoUrl }: { productId: string; name: string; photoUrl: string | null }) {
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("photo", file);
    startTransition(async () => {
      const result = await updateProductPhotoAction(productId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) setPhotoUrl(result.url);
    });
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-200 p-3 text-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="group relative"
        aria-label={`Changer la photo de ${name}`}
      >
        <ProductThumbnail photoUrl={photoUrl} name={name} size={72} rounded="rounded-xl" />
        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition group-hover:bg-black/40">
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <Camera className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
          )}
        </span>
      </button>
      <p className="line-clamp-2 text-xs font-medium text-zinc-700">{name}</p>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleChange} />
    </div>
  );
}

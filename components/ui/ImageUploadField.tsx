"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function ImageUploadField({
  name,
  removeFieldName,
  initialUrl,
  label,
  hint,
  shape = "square",
  size = 96,
}: {
  name: string;
  removeFieldName: string;
  initialUrl?: string | null;
  label: string;
  hint: string;
  shape?: "square" | "circle";
  size?: number;
}) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [removed, setRemoved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRemoved(false);
    setPreview(URL.createObjectURL(file));
  }

  function handleRemove() {
    setPreview(null);
    setRemoved(true);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</label>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-zinc-300 bg-zinc-50",
            shape === "circle" ? "rounded-full" : "rounded-xl"
          )}
          style={{ width: size, height: size }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={label} className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-7 w-7 text-zinc-300" />
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            <Camera className="h-4 w-4" />
            {preview ? "Changer l'image" : "Ajouter une image"}
            <input
              ref={inputRef}
              type="file"
              name={name}
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFile}
              className="hidden"
            />
          </label>
          {preview && (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:underline"
            >
              <X className="h-3.5 w-3.5" /> Retirer l&apos;image
            </button>
          )}
          <p className="text-xs text-zinc-400">{hint}</p>
        </div>
      </div>
      {removed && <input type="hidden" name={removeFieldName} value="true" />}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { PACKAGING_TYPE_PRESETS } from "@/lib/packaging-presets";

/** Puces de types de conditionnement courants + « Autre » (champ libre) — un seul input "name" au final, pour rester une simple valeur texte côté serveur. */
export function PackagingTypePicker({
  name,
  id,
  defaultValue = "",
}: {
  name: string;
  id?: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isCustom = value !== "" && !(PACKAGING_TYPE_PRESETS as readonly string[]).includes(value);

  return (
    <div ref={wrapperRef} className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PACKAGING_TYPE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setValue(preset)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              value === preset
                ? "border-zindo-green-500 bg-zindo-green-50 text-zindo-green-700"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {preset}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setValue("");
            wrapperRef.current?.querySelector("input")?.focus();
          }}
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            isCustom
              ? "border-zindo-green-500 bg-zindo-green-50 text-zindo-green-700"
              : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          Autre
        </button>
      </div>
      <Input
        id={id}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required
        placeholder="ou saisir un libellé personnalisé..."
      />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";

// Une seule langue active pour l'instant ; en ajouter ici plus tard suffira
// à les faire apparaître dans le sélecteur (ex: { code: "en", label: "English", flag: "🇬🇧" }).
const LOCALES = [{ code: "fr", label: "Français", flag: "🇫🇷" }];

export function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = LOCALES[0];

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
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-zindo-navy-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-zindo-navy-700 shadow-sm backdrop-blur transition hover:border-zindo-orange-500 hover:text-zindo-orange-600 active:scale-95"
      >
        <Globe className="h-4 w-4" />
        {current.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className="animate-zindo-fade-in absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-100 bg-white py-1 shadow-lg"
        >
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === current.code}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zindo-navy-700 hover:bg-zindo-orange-50"
            >
              <span aria-hidden>{l.flag}</span>
              {l.label}
              {l.code === current.code && <Check className="ml-auto h-3.5 w-3.5 text-zindo-orange-600" />}
            </button>
          ))}
          <p className="border-t border-zinc-100 px-3 pt-2 text-xs text-zinc-400">
            D&apos;autres langues arrivent bientôt.
          </p>
        </div>
      )}
    </div>
  );
}

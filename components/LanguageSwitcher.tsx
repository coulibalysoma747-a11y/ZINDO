"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Globe, ChevronDown, Check } from "lucide-react";

// Pages traduites pour l'instant (accueil, connexion, inscription,
// CGU/confidentialité) — voir app/en/. Une page absente de cette liste ne
// propose que la langue dans laquelle elle existe déjà ; l'étendre au reste
// de l'application consistera à ajouter ses deux chemins ici.
const FR_TO_EN: Record<string, string> = {
  "/": "/en",
  "/login": "/en/login",
  "/inscription": "/en/inscription",
  "/cgu": "/en/cgu",
  "/confidentialite": "/en/confidentialite",
};
const EN_TO_FR: Record<string, string> = Object.fromEntries(Object.entries(FR_TO_EN).map(([fr, en]) => [en, fr]));

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isEnglish = pathname === "/en" || pathname.startsWith("/en/");
  const current = isEnglish ? "en" : "fr";
  const frHref = isEnglish ? EN_TO_FR[pathname] : pathname;
  const enHref = isEnglish ? pathname : FR_TO_EN[pathname];

  const options = [
    { code: "fr" as const, label: "Français", flag: "🇫🇷", href: frHref },
    { code: "en" as const, label: "English", flag: "🇬🇧", href: enHref },
  ];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const currentOption = options.find((o) => o.code === current)!;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-zindo-ink-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-zindo-ink-700 shadow-sm backdrop-blur transition hover:border-zindo-green-500 hover:text-zindo-green-600 active:scale-95"
      >
        <Globe className="h-4 w-4" />
        {currentOption.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          className="animate-zindo-fade-in absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-100 bg-white py-1 shadow-lg"
        >
          {options.map((o) => {
            const disabled = !o.href;
            return (
              <button
                key={o.code}
                type="button"
                role="option"
                aria-selected={o.code === current}
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  if (o.href && o.code !== current) router.push(o.href);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  disabled ? "cursor-not-allowed text-zinc-300" : "text-zindo-ink-700 hover:bg-zindo-green-50"
                }`}
              >
                <span aria-hidden>{o.flag}</span>
                {o.label}
                {o.code === current && <Check className="ml-auto h-3.5 w-3.5 text-zindo-green-600" />}
              </button>
            );
          })}
          <p className="border-t border-zinc-100 px-3 pt-2 text-xs text-zinc-400">
            D&apos;autres pages arrivent bientôt en anglais.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";
import { Label } from "@/components/ui/Input";
import { COUNTRIES, DEFAULT_COUNTRY_CODE, getCountry, normalizeSearch, type Country } from "@/lib/countries";

// Pays proposés en tête de liste (Afrique de l'Ouest, là où ZINDO est le plus utilisé).
const FREQUENT = ["BF", "CI", "ML", "NE", "SN", "TG", "BJ", "GN", "GH"];

const fieldClass =
  "flex h-11 w-full items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 text-left text-sm text-zinc-900 focus-within:border-zindo-green-600 focus-within:ring-2 focus-within:ring-zindo-green-600/20";

/**
 * Choix du pays puis de la ville, avec recherche : tous les pays du monde
 * (Burkina Faso par défaut) et leurs villes (GeoNames). La ville reste libre :
 * un village absent de la liste peut être saisi tel quel.
 * Champs envoyés : `countryName` = code ISO du pays, `cityName` = nom de la ville.
 */
export function CountryCityPicker({
  countryName = "country",
  cityName = "city",
  defaultCountry = DEFAULT_COUNTRY_CODE,
  defaultCity = "",
  countryLabel = "Pays",
  cityLabel = "Ville",
  cityRequired = false,
  locale = "fr",
  onCountryChange,
}: {
  countryName?: string;
  cityName?: string;
  defaultCountry?: string;
  defaultCity?: string;
  countryLabel?: string;
  cityLabel?: string;
  cityRequired?: boolean;
  locale?: "fr" | "en";
  onCountryChange?: (country: Country) => void;
}) {
  const [country, setCountry] = useState<Country>(getCountry(defaultCountry));
  const [city, setCity] = useState(defaultCity);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CountrySelect
        locale={locale}
        label={countryLabel}
        name={countryName}
        value={country}
        onChange={(c) => {
          setCountry(c);
          setCity("");
          onCountryChange?.(c);
        }}
      />
      <CityInput locale={locale} label={cityLabel} name={cityName} country={country} value={city} onChange={setCity} required={cityRequired} />
    </div>
  );
}

function CountrySelect({ locale, label, name, value, onChange }: { locale: "fr" | "en"; label: string; name: string; value: Country; onChange: (c: Country) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const term = normalizeSearch(q);
    if (!term) {
      const frequent = FREQUENT.map((code) => COUNTRIES.find((c) => c.code === code)).filter((c): c is Country => !!c);
      return [...frequent, ...COUNTRIES.filter((c) => !FREQUENT.includes(c.code))];
    }
    // Début du nom d'abord (« bur » → Burkina Faso, Burundi), puis ailleurs dans le nom ou l'indicatif.
    const starts = COUNTRIES.filter((c) => normalizeSearch(c.name.fr).startsWith(term) || normalizeSearch(c.name.en).startsWith(term));
    const contains = COUNTRIES.filter((c) => !starts.includes(c) && (normalizeSearch(c.name.fr).includes(term) || c.dialCode.includes(term) || c.code.toLowerCase() === term));
    return [...starts, ...contains];
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function choose(c: Country) {
    onChange(c);
    setOpen(false);
    setQ("");
  }

  return (
    <div ref={box} className="relative">
      <Label>{label}</Label>
      <input type="hidden" name={name} value={value.code} />
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setActive(0);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${fieldClass} justify-between`}
      >
        <span className="truncate">
          {value.name[locale]} <span className="text-zinc-400">{value.dialCode}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(results.length - 1, i + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(0, i - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (results[active]) choose(results[active]);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder={locale === "en" ? "Search a country…" : "Rechercher un pays…"}
              aria-label={locale === "en" ? "Search a country" : "Rechercher un pays"}
              className="h-11 min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
            />
          </div>
          <ul ref={list} role="listbox" className="max-h-72 overflow-y-auto py-1">
            {results.length === 0 && <li className="px-3 py-2 text-sm text-zinc-500">{locale === "en" ? "No country found." : "Aucun pays trouvé."}</li>}
            {results.map((c, i) => (
              <li key={c.code} data-index={i} role="option" aria-selected={c.code === value.code}>
                {!q && i === FREQUENT.length && <div className="mx-3 my-1 border-t border-zinc-100" />}
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(c)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${i === active ? "bg-zinc-100" : ""}`}
                >
                  <span className="flex-1 truncate text-zinc-900">{c.name[locale]}</span>
                  <span className="shrink-0 text-xs text-zinc-400">{c.dialCode}</span>
                  {c.code === value.code && <Check className="h-4 w-4 shrink-0 text-zindo-green-600" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CityInput({
  locale,
  label,
  name,
  country,
  value,
  onChange,
  required,
}: {
  locale: "fr" | "en";
  label: string;
  name: string;
  country: Country;
  value: string;
  onChange: (v: string) => void;
  required: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public/geo/villes?pays=${country.code}&q=${encodeURIComponent(value.trim())}`, { signal: controller.signal });
        if (res.ok) setCities(((await res.json()) as { cities: string[] }).cities);
      } catch {
        // Frappe suivante ou réseau coupé : la saisie libre reste possible.
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [country.code, value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const shown = cities.filter((c) => c !== value);

  return (
    <div ref={box} className="relative">
      <Label htmlFor={`${name}-input`}>{label}</Label>
      <div className={fieldClass}>
        <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
        <input
          id={`${name}-input`}
          name={name}
          value={value}
          required={required}
          autoComplete="off"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open || shown.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(shown.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(-1, i - 1));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              onChange(shown[active]);
              setOpen(false);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={`${locale === "en" ? "E.g." : "Ex."} ${country.capital || (locale === "en" ? "your city" : "votre ville")}`}
          className="h-full min-w-0 flex-1 bg-transparent focus:outline-none"
        />
      </div>
      {open && shown.length > 0 && (
        <ul role="listbox" className="absolute inset-x-0 top-full z-50 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl">
          {shown.map((c, i) => (
            <li key={c} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-900 ${i === active ? "bg-zinc-100" : ""}`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-zinc-400" /> {c}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-zinc-500">{locale === "en" ? "City not in the list? Just type it." : "Votre ville n'est pas dans la liste ? Écrivez-la simplement."}</p>
    </div>
  );
}

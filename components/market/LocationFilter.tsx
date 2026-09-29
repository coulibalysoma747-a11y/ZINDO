"use client";

import { useState } from "react";
import type { LocationOptions } from "@/lib/market-location";

const selectClass = "h-10 w-full rounded-lg border border-zinc-300 bg-white px-2 text-sm";

/** Filtre Pays puis Ville (villes du pays choisi seulement) pour les formulaires du Marché. */
export function LocationFilter({ options, country: initialCountry, city: initialCity }: { options: LocationOptions; country: string; city: string }) {
  const [country, setCountry] = useState(initialCountry);
  const [city, setCity] = useState(initialCity);
  const cities = country ? options.cities[country] ?? [] : [];

  return (
    <div className="space-y-2">
      <select
        name="pays"
        value={country}
        onChange={(e) => {
          setCountry(e.target.value);
          setCity("");
        }}
        aria-label="Pays"
        className={selectClass}
      >
        <option value="">Tous les pays</option>
        {options.countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name} ({c.count})
          </option>
        ))}
      </select>
      <select name="ville" value={city} onChange={(e) => setCity(e.target.value)} disabled={!country} aria-label="Ville" className={`${selectClass} disabled:bg-zinc-50 disabled:text-zinc-400`}>
        <option value="">{country ? "Toutes les villes" : "Choisissez d'abord un pays"}</option>
        {cities.map((c) => (
          <option key={c.key} value={c.key}>
            {c.name} ({c.count})
          </option>
        ))}
      </select>
    </div>
  );
}

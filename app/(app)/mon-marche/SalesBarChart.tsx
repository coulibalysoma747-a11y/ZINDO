"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";

/**
 * Ventes livrées par jour (ou par mois) : une seule série, barres fines
 * arrondies en haut, infobulle au survol ou au toucher, tableau pour les
 * lecteurs d'écran. Pas de légende : le titre nomme la série.
 */
export function SalesBarChart({ points, currency }: { points: { label: string; value: number }[]; currency: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...points.map((p) => p.value), 1);
  const format = (v: number) => formatMoney(v, currency);
  // Graduations discrètes : 0, moitié, maximum.
  const ticks = [max, max / 2, 0];

  return (
    <div>
      <div className="relative flex h-48 gap-2">
        <div className="flex w-16 shrink-0 flex-col justify-between text-right text-[11px] text-zinc-400">
          {ticks.map((t, i) => (
            <span key={i}>{t >= 1000 ? `${Math.round(t / 1000).toLocaleString("fr-FR")} k` : Math.round(t)}</span>
          ))}
        </div>
        <div className="relative flex flex-1 items-end gap-[2px] border-b border-zinc-200">
          {ticks.slice(0, 2).map((_, i) => (
            <span key={i} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-zinc-100" style={{ top: `${i * 50}%` }} />
          ))}
          {points.map((p, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${p.label} : ${format(p.value)}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
              className="group relative flex h-full flex-1 items-end justify-center"
            >
              <span
                className={`w-full max-w-10 rounded-t-[4px] transition-colors ${active === i ? "bg-zindo-green-700" : "bg-zindo-green-500"}`}
                style={{ height: p.value > 0 ? `max(${(p.value / max) * 100}%, 3px)` : 0 }}
              />
              {active === i && (
                <span className="absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
                  <span className="block text-zinc-300">{p.label}</span>
                  <span className="font-semibold">{format(p.value)}</span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="ml-[4.5rem] mt-1.5 flex gap-[2px]">
        {points.map((p, i) => (
          <span key={i} className="flex flex-1 justify-center overflow-visible whitespace-nowrap text-[11px] text-zinc-500">
            {points.length <= 12 || i % 5 === 0 ? p.label : ""}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Ventes livrées</caption>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <th scope="row">{p.label}</th>
              <td>{format(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { CloudOff, TrendingUp } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ");

// Ventes d'exemple qui arrivent l'une après l'autre dans la maquette.
const SALES: { product: string; qty: number; amount: number; pay: string }[] = [
  { product: "Ciment 50 kg", qty: 4, amount: 24000, pay: "Espèces" },
  { product: "Peinture 5 L", qty: 1, amount: 18500, pay: "Orange Money" },
  { product: "Tuyau PVC", qty: 6, amount: 9000, pay: "Espèces" },
  { product: "Robinet laiton", qty: 2, amount: 7000, pay: "Moov Money" },
  { product: "Fer à béton 10", qty: 10, amount: 45000, pay: "Crédit" },
  { product: "Cadenas 40 mm", qty: 3, amount: 4500, pay: "Wave" },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Tableau de bord d'exemple : une nouvelle vente arrive toutes les 2,5 secondes. */
export function LiveDashboard({ phone = true }: { phone?: boolean }) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setCount((c) => c + 1), 2500);
    return () => clearInterval(id);
  }, [reduced]);

  const recent = Array.from({ length: 4 }, (_, i) => ({ ...SALES[(count - 1 - i + SALES.length * 100) % SALES.length], key: count - i }));
  const total = 57500 + Array.from({ length: count - 3 }, (_, i) => SALES[(i + 3) % SALES.length].amount).reduce((a, b) => a + b, 0);
  const bars = [38, 52, 44, 70, 58, 66, Math.min(96, 40 + (count - 3) * 6)];

  return (
    <div className="relative" aria-hidden>
      <div className={`overflow-hidden rounded-2xl border border-white/10 bg-white text-zindo-ink-900 ${phone ? "md:mr-16" : ""} shadow-[0_40px_80px_-24px_rgb(0_0_0/0.55)]`}>
        <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 min-w-0 truncate text-xs font-medium text-zinc-500">Quincaillerie Diallo · Tableau de bord (FCFA)</span>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-zindo-green-50 px-2 py-0.5 text-[10px] font-semibold text-zindo-green-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zindo-green-500" /> En direct
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-5">
          <Kpi label="Ventes du jour" value={fmt(total)} delta="+12 %" />
          <Kpi label="Bénéfice estimé" value={fmt(Math.round(total * 0.26))} delta="+8 %" />
          <Kpi label="Valeur du stock" value="4 850 000" />
        </div>
        <div className="grid gap-3 px-3 pb-4 sm:grid-cols-[1fr_1.15fr] sm:gap-4 sm:px-5 sm:pb-5">
          <div className="rounded-xl border border-zinc-100 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <TrendingUp className="h-3.5 w-3.5 text-zindo-green-600" /> Ventes de la semaine
            </p>
            <div className="mt-3 flex h-20 items-end gap-1.5 sm:h-28">
              {bars.map((h, i) => (
                <span
                  key={i}
                  className={`flex-1 rounded-t-md transition-[height] duration-700 ${i === 6 ? "bg-zindo-green-500" : "bg-zindo-green-100"}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="hidden rounded-xl border border-zinc-100 p-3 sm:block">
            <p className="text-xs font-semibold">Dernières ventes</p>
            <ul className="mt-2 space-y-1 text-xs">
              {recent.map((s, i) => (
                <li key={s.key} className={`flex items-center justify-between gap-2 rounded-md px-1.5 py-1 ${i === 0 && !reduced ? "zindo-row-in" : ""}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-zinc-700">
                      {s.product} × {s.qty}
                    </span>
                    <span className="text-[10px] text-zinc-400">{s.pay}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{fmt(s.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Téléphone : la même caisse sur mobile. */}
      {phone && (
      <div className="zindo-float absolute -bottom-16 -right-4 hidden w-[168px] rounded-[2rem] border-[7px] border-zinc-900 bg-white shadow-2xl md:block">
        <div className="mx-auto mt-1.5 h-1.5 w-12 rounded-full bg-zinc-900" />
        <div className="px-3 pb-4 pt-2 text-zindo-ink-900">
          <p className="text-[11px] font-bold">Caisse</p>
          <ul className="mt-2 space-y-1.5 text-[10px]">
            {recent.slice(0, 3).map((s, i) => (
              <li key={s.key} className={`flex justify-between gap-1 rounded px-1 py-0.5 ${i === 0 && !reduced ? "zindo-row-in" : ""}`}>
                <span className="truncate text-zinc-600">{s.product}</span>
                <span className="shrink-0 font-semibold">{fmt(s.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-zinc-100 pt-2 text-[11px] font-bold">
            <span>Total</span>
            <span className="tabular-nums">{fmt(recent.slice(0, 3).reduce((t, s) => t + s.amount, 0))}</span>
          </div>
          <div className="mt-2.5 rounded-lg bg-zindo-green-500 py-2 text-center text-[10px] font-bold text-white">Encaisser</div>
        </div>
      </div>
      )}

      {/* Indicateur hors connexion. */}
      <div className="zindo-float absolute -left-3 -top-5 hidden items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zindo-ink-900 shadow-xl ring-1 ring-black/5 sm:flex [animation-delay:1.5s]">
        <CloudOff className="h-3.5 w-3.5 text-zindo-green-600" /> Fonctionne sans Internet
      </div>
    </div>
  );
}

function Kpi({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-zinc-100 p-2.5 sm:p-3">
      <p className="truncate text-[10px] text-zinc-500 sm:text-[11px]">{label}</p>
      <p className="mt-1 truncate text-sm font-extrabold tabular-nums tracking-tight sm:text-lg">
        {value}
      </p>
      {delta && <p className="text-[10px] font-semibold text-zindo-green-600 sm:text-[11px]">{delta}</p>}
    </div>
  );
}

/** Fait apparaître son contenu en douceur quand il entre à l'écran. */
export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}

export type Story = { business: string; city: string; text: string };

/** Exemples d'utilisation qui changent toutes les 6 secondes (présentés comme des exemples, pas comme des avis). */
export function StoriesCarousel({ stories }: { stories: Story[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % stories.length), 6000);
    return () => clearInterval(id);
  }, [reduced, paused, stories.length]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative min-h-[210px] sm:min-h-[170px]">
        {stories.map((s, i) => (
          <figure
            key={s.business}
            aria-hidden={i !== index}
            className={`absolute inset-0 transition-[opacity,transform] duration-700 ${i === index ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
          >
            <blockquote className="text-xl font-semibold leading-snug tracking-tight text-white sm:text-2xl">{s.text}</blockquote>
            <figcaption className="mt-5 text-sm text-zindo-green-200">
              <span className="font-semibold text-white">{s.business}</span> · {s.city}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-6 flex gap-2">
        {stories.map((s, i) => (
          <button
            key={s.business}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Exemple ${i + 1} : ${s.business}`}
            className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-white" : "w-3 bg-white/30 hover:bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Mémorise l'aperçu de la nouvelle page d'accueil dans ce navigateur (24 h), pour
 * que la connexion et l'inscription s'affichent aussi dans le nouveau style.
 */
export function ApercuCookie() {
  useEffect(() => {
    document.cookie = "zindo_apercu=pro; path=/; max-age=86400; samesite=lax";
  }, []);
  return null;
}

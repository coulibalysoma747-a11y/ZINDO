"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Barcode, CheckCircle2, PackagePlus, Wallet } from "lucide-react";

/*
 * Écrans animés de la page d'accueil (données d'exemple). Chaque animation ne
 * tourne que lorsque l'écran est visible, et s'arrête si l'appareil demande
 * de réduire les animations : l'état final est alors affiché tel quel.
 */

const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ");

function useActive<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const el = ref.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMedia = () => setReduced(media.matches);
    onMedia();
    media.addEventListener("change", onMedia);
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 });
    if (el) io.observe(el);
    return () => {
      io.disconnect();
      media.removeEventListener("change", onMedia);
    };
  }, []);
  return [ref, visible && !reduced, reduced] as const;
}

/** Compteur qui avance d'une étape à intervalle régulier, en boucle, seulement si actif. */
function useTicker(active: boolean, steps: number, ms: number) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => (t + 1) % steps), ms);
    return () => clearInterval(id);
  }, [active, steps, ms]);
  return tick;
}

export function Frame({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_60px_-20px_rgb(5_58_32/0.25)]">
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 min-w-0 truncate text-xs font-medium text-zinc-500">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ---------- Caisse : le panier se remplit, le total monte, le ticket sort. ---------- */

const CART = [
  { name: "Huile moteur 1 L", qty: 3, total: 7500 },
  { name: "Chambre à air", qty: 2, total: 8000 },
  { name: "Ampoule LED", qty: 4, total: 6000 },
];
// 0 : panier vide · 1 à 3 : produits ajoutés · 4 : paiement choisi · 5 et 6 : ticket imprimé.
const CAISSE_STEPS = 8;

export function CaisseAnimee() {
  const [ref, active, reduced] = useActive<HTMLDivElement>();
  const tick = useTicker(active, CAISSE_STEPS, 1100);
  const step = reduced ? 4 : Math.min(tick, 6);
  const items = CART.slice(0, Math.min(step, 3));
  const total = items.reduce((s, i) => s + i.total, 0);
  const paid = step >= 5;

  return (
    <div ref={ref} aria-hidden>
      <Frame title="Caisse">
        <div className="relative p-5">
          <div className="relative flex items-center gap-2 overflow-hidden rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-400">
            <Barcode className="h-4 w-4" /> Scanner ou rechercher un produit…
            {step >= 1 && step <= 3 && (
              <span key={step} className="zindo-scan absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-red-500/25 to-transparent" />
            )}
          </div>
          <ul className="mt-4 min-h-[132px] divide-y divide-zinc-100 text-sm">
            {items.length === 0 && <li className="py-10 text-center text-xs text-zinc-400">Le panier est vide</li>}
            {items.map((i) => (
              <li key={i.name} className="zindo-row-in flex items-center justify-between rounded-md px-1 py-2.5">
                <span>
                  {i.name} <span className="text-zinc-400">× {i.qty}</span>
                </span>
                <span className="font-semibold tabular-nums">{fmt(i.total)} FCFA</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-3">
            <span className="text-sm text-zinc-600">Total</span>
            <span key={total} className="zindo-pop text-xl font-extrabold tabular-nums">
              {fmt(total)} FCFA
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            {["Espèces", "Mobile Money", "Crédit"].map((m, i) => (
              <span
                key={m}
                className={`rounded-lg py-2 transition-colors duration-300 ${
                  step >= 4 && i === 0 ? "border-2 border-zindo-green-500 bg-zindo-green-50 text-zindo-green-700" : "border border-zinc-200 text-zinc-600"
                }`}
              >
                {m}
              </span>
            ))}
          </div>
          <div
            className={`mt-3 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold text-white transition-all duration-300 ${
              paid ? "bg-zindo-green-700" : step >= 4 ? "bg-zindo-green-500 ring-4 ring-zindo-green-500/20" : "bg-zindo-green-500/50"
            }`}
          >
            {paid ? (
              <>
                <CheckCircle2 className="h-4 w-4" /> Vente enregistrée, ticket imprimé
              </>
            ) : (
              "Valider et imprimer le ticket"
            )}
          </div>
          {paid && (
            <div className="zindo-appear absolute right-4 top-16 w-40 rounded-lg bg-white p-3 font-mono text-[10px] shadow-2xl ring-1 ring-black/5">
              <p className="text-center font-bold">TICKET N° 1047</p>
              <div className="my-1.5 border-t border-dashed border-zinc-300" />
              {CART.map((i) => (
                <p key={i.name} className="flex justify-between gap-1">
                  <span className="truncate">{i.name}</span>
                  <span>{fmt(i.total)}</span>
                </p>
              ))}
              <div className="my-1.5 border-t border-dashed border-zinc-300" />
              <p className="flex justify-between font-bold">
                <span>TOTAL</span>
                <span>21 500 F</span>
              </p>
            </div>
          )}
        </div>
      </Frame>
    </div>
  );
}

/* ---------- Stock : les ventes font baisser, l'alerte tombe, la livraison remonte. ---------- */

const BATTERY = [7, 6, 5, 4, 3, 23, 23];
const MINIMUM = 5;

export function StockAnime() {
  const [ref, active, reduced] = useActive<HTMLDivElement>();
  const tick = useTicker(active, BATTERY.length, 1600);
  const i = reduced ? 4 : tick;
  const qty = BATTERY[i];
  const restocked = i >= 5;
  const rows: [string, string, number][] = [
    ["Plaquette de frein", "FR-001", 25],
    ["Batterie 12 V", "BA-012", qty],
    ["Pneu 2.75-17", "PN-275", 0],
    ["Filtre à huile", "FH-110", 18],
  ];
  const state = (q: number) => (q === 0 ? "out" : q <= MINIMUM ? "low" : "ok");
  const badge = { ok: "bg-zindo-green-50 text-zindo-green-700", low: "bg-amber-50 text-amber-700", out: "bg-red-50 text-red-700" };
  const label = { ok: "En stock", low: "Stock faible", out: "Rupture" };

  return (
    <div ref={ref} aria-hidden className="relative">
      <Frame title="Stock · Boutique principale">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50/60 text-xs text-zinc-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">Produit</th>
              <th className="px-3 py-2.5 text-right font-medium">Qté</th>
              <th className="px-5 py-2.5 text-right font-medium">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map(([name, code, q]) => {
              const s = state(q);
              const live = code === "BA-012";
              return (
                <tr key={code} className={live ? "bg-zindo-green-50/40" : ""}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{name}</p>
                    <p className="text-xs text-zinc-400">{code}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">
                    <span key={live ? q : undefined} className={live ? "zindo-pop inline-block" : ""}>
                      {q}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold transition-colors duration-300 ${badge[s]}`}>{label[s]}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Frame>
      <div className="pointer-events-none absolute -bottom-6 right-4 left-4 flex justify-end sm:left-auto">
        {restocked ? (
          <p key="achat" className="zindo-appear flex items-center gap-2 rounded-xl bg-zindo-green-950 px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
            <PackagePlus className="h-4 w-4 text-zindo-green-300" /> Livraison fournisseur reçue : +20 batteries
          </p>
        ) : qty <= MINIMUM ? (
          <p key="alerte" className="zindo-appear flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-amber-800 shadow-xl ring-1 ring-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Stock faible : Batterie 12 V, reste {qty}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- Crédits : le total s'affiche, un client rembourse, sa dette baisse. ---------- */

const TOTAL_CREDITS = 850000;

export function CreditsAnimes() {
  const [ref, active, reduced] = useActive<HTMLDivElement>();
  const [shown, setShown] = useState(0);
  const tick = useTicker(active, 4, 2200);
  const repaid = !reduced && (tick === 2 || tick === 3);

  // Le total défile de 0 à sa valeur la première fois que l'écran apparaît.
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const start = performance.now();
    const run = (now: number) => {
      const p = Math.min(1, (now - start) / 1200);
      setShown(Math.round(TOTAL_CREDITS * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  const base = reduced ? TOTAL_CREDITS : shown;
  const total = repaid ? base - 10000 : base;

  return (
    <div ref={ref} aria-hidden className="relative">
      <Frame title="Crédits clients">
        <div className="p-5">
          <div className="rounded-xl bg-zindo-green-950 p-4 text-white">
            <p className="text-xs text-zindo-green-200">Total dû par vos clients</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{fmt(total)} FCFA</p>
          </div>
          <ul className="mt-4 divide-y divide-zinc-100 text-sm">
            {[
              ["Moussa Traoré", repaid ? "remboursement reçu à l'instant" : "depuis 12 jours", repaid ? 15000 : 25000],
              ["Awa Ouédraogo", "depuis 3 jours", 12500],
              ["Garage Kaboré", "échéance demain", 140000],
            ].map(([n, since, v], idx) => (
              <li key={n as string} className={`flex items-center justify-between rounded-md px-1 py-3 transition-colors duration-500 ${idx === 0 && repaid ? "bg-zindo-green-50" : ""}`}>
                <span>
                  <span className="block font-medium">{n}</span>
                  <span className={`text-xs ${idx === 0 && repaid ? "font-semibold text-zindo-green-700" : "text-zinc-400"}`}>{since}</span>
                </span>
                <span key={String(v)} className={`font-semibold tabular-nums ${idx === 0 ? "zindo-pop inline-block" : ""}`}>
                  {fmt(v as number)} FCFA
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Frame>
      {repaid && (
        <p className="zindo-appear pointer-events-none absolute -bottom-6 right-4 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-zindo-green-800 shadow-xl ring-1 ring-zindo-green-200">
          <Wallet className="h-4 w-4 text-zindo-green-600" /> Moussa Traoré a payé 10 000 FCFA (Orange Money)
        </p>
      )}
    </div>
  );
}

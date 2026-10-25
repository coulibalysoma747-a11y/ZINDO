"use client";

import { useEffect, useRef, useState } from "react";
import { BatteryCharging, Bike, Droplets, History, Printer, RefreshCw } from "lucide-react";

const ITEMS = [
  { icon: Bike, tone: "bg-zindo-blue-50 text-zindo-blue-700", name: "Plaquettes de frein FR-001", detail: "Pièce moto · Réf M-442", stock: 24, unit: 7500 },
  { icon: BatteryCharging, tone: "bg-zindo-copper-50 text-zindo-copper-700", name: "Batterie moto 12V 7Ah", detail: "Garantie 6 mois · Réf B-109", stock: 6, unit: 14000 },
  { icon: Droplets, tone: "bg-zindo-ink-50 text-zindo-ink-700", name: "Huile moteur 4T Super 1L", detail: "En rayon · Réf OIL-44", stock: 48, unit: 4500 },
];

const PAYMENTS = [
  { key: "orange", label: "Orange", full: "Orange Money", dot: "bg-[#f97316]" },
  { key: "wave", label: "Wave", full: "Wave", dot: "bg-[#00c3f8]" },
  { key: "cash", label: "Espèces", full: "Espèces", dot: "bg-zindo-ink-500" },
  { key: "credit", label: "Crédit", full: "Crédit", dot: "" },
] as const;

type PaymentKey = (typeof PAYMENTS)[number]["key"];

const NBSP = String.fromCharCode(160);
const fcfa = (value: number) => value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

export function PosSimulator() {
  const [payment, setPayment] = useState<PaymentKey>("cash");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const total = ITEMS.reduce((sum, item) => sum + item.unit, 0);
  const current = PAYMENTS.find((item) => item.key === payment)!;

  function validate() {
    if (status !== "idle") return;
    setStatus("saving");
    timers.current.push(
      setTimeout(() => {
        setStatus("done");
        timers.current.push(setTimeout(() => setStatus("idle"), 2200));
      }, 700),
    );
  }

  const label =
    status === "saving"
      ? "Enregistrement de la vente…"
      : status === "done"
        ? "Ticket #OUA-8492 imprimé"
        : payment === "cash"
          ? "Valider l'encaissement et imprimer le ticket"
          : `Encaisser via ${current.full} et imprimer`;

  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-3 rounded-[1.75rem] bg-zindo-blue-700/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-zindo-ink-200/70 bg-white shadow-zindo-float">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-zindo-ink-900 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden className="hidden gap-1.5 sm:flex">
              <i className="h-2.5 w-2.5 rounded-full bg-white/25" />
              <i className="h-2.5 w-2.5 rounded-full bg-white/25" />
              <i className="h-2.5 w-2.5 rounded-full bg-white/25" />
            </span>
            <span className="truncate text-[11px] font-semibold tracking-wide text-white/90 sm:ml-1">Caisse principale · Exemple</span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zindo-success-600" />
            Hors ligne
          </span>
        </div>

        <div className="space-y-3 bg-zindo-cream/40 p-4">
          <div className="flex items-center justify-between gap-2 pb-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zindo-ink-500">Ticket de vente #OUA-8492</span>
            <span className="text-[11px] font-semibold text-zindo-blue-700">Client : Comptoir</span>
          </div>

          {ITEMS.map(({ icon: Icon, tone, name, detail, stock, unit }) => (
            <div key={name} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-white p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h4 className="truncate text-[13px] font-semibold text-zindo-ink-900 sm:text-sm">{name}</h4>
                  <p className="text-[11px] text-zinc-500 sm:truncate">
                    {detail} · <span className="font-semibold text-zindo-success-600">Stock : {stock}</span>
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[12px] font-semibold tabular-nums text-zindo-ink-900">1 × {fcfa(unit)} F</span>
              </div>
            </div>
          ))}

          <div className="space-y-1 pt-1 text-[12px] text-zinc-500">
            <div className="flex justify-between"><span>Sous-total ({ITEMS.length} articles)</span><span className="tabular-nums text-zindo-ink-700">{fcfa(total)} FCFA</span></div>
            <div className="flex justify-between"><span>Remise client</span><span className="tabular-nums">0 FCFA</span></div>
            <div className="mt-2 flex items-baseline justify-between rounded-xl bg-zindo-ink-900 p-3 text-white">
              <span className="text-[15px] font-semibold tracking-tight sm:text-[17px]">Total à encaisser</span>
              <span className="text-[19px] font-bold tracking-tight tabular-nums sm:text-[22px]">{fcfa(total)} FCFA</span>
            </div>
          </div>

          <div>
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zindo-ink-500">Mode d&apos;encaissement</span>
            <div role="radiogroup" aria-label="Mode d'encaissement" className="grid grid-cols-4 gap-2 text-center">
              {PAYMENTS.map((item) => {
                const active = item.key === payment;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPayment(item.key)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold transition-colors ${active ? "bg-zindo-blue-700 text-white shadow-sm" : "bg-white text-zindo-ink-800 ring-1 ring-zinc-200 hover:bg-zindo-blue-50"}`}
                  >
                    {item.dot ? <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-white" : item.dot}`} /> : <History className="h-3.5 w-3.5" />}
                    <span className="w-full truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={validate}
            aria-live="polite"
            className={`mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[13px] font-semibold text-white shadow-sm transition-colors active:scale-[0.99] sm:text-sm ${status === "saving" ? "bg-zindo-blue-800" : "bg-zindo-blue-700 hover:bg-zindo-blue-800"}`}
          >
            <Printer className="h-5 w-5 shrink-0" />
            <span>{label}</span>
          </button>
        </div>
      </div>

      <div className="absolute -bottom-14 left-6 hidden items-center gap-3 rounded-xl border border-zinc-200/80 bg-white p-3 shadow-zindo-raised sm:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zindo-blue-50 text-zindo-blue-700">
          <RefreshCw className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold text-zindo-ink-900">Synchronisation automatique</p>
          <p className="text-xs text-zinc-500">Dès le retour d&apos;Internet</p>
        </div>
      </div>
    </div>
  );
}

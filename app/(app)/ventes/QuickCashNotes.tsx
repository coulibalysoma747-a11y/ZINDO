"use client";

import { useRef } from "react";
import { formatMoney } from "@/lib/format";

/** Billets et pièces les plus courants en FCFA. */
const NOTES = [500, 1000, 2000, 5000, 10000];

/**
 * Billets rapides (flag billets_rapides) : le vendeur touche le billet que
 * le client lui tend au lieu de taper le montant reçu, et la monnaie à
 * rendre s'affiche aussitôt. Des clics successifs s'additionnent (le client
 * donne 10 000 puis 5 000) ; si le montant a été tapé au clavier entre-temps,
 * le premier clic repart de zéro.
 */
export function QuickCashNotes({
  total,
  currency,
  amountPaidInput,
  onAmountPaidChange,
}: {
  total: number;
  currency: string;
  amountPaidInput: string;
  onAmountPaidChange: (value: string) => void;
}) {
  // Dernière valeur posée par ces boutons : tant que le champ la contient
  // encore, un nouveau billet s'y ajoute au lieu de la remplacer.
  const lastFromNotes = useRef<string | null>(null);

  function giveNote(note: number) {
    const current = amountPaidInput !== "" && amountPaidInput === lastFromNotes.current ? Number(amountPaidInput) : 0;
    const next = String(current + note);
    lastFromNotes.current = next;
    onAmountPaidChange(next);
  }

  function giveExact() {
    lastFromNotes.current = null;
    onAmountPaidChange(String(total));
  }

  const given = amountPaidInput === "" ? null : Number(amountPaidInput);
  const change = given === null ? 0 : given - total;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={giveExact}
          className="h-11 rounded-lg border border-zindo-green-600 bg-zindo-green-50 text-sm font-bold text-zindo-green-700 transition-colors hover:bg-zindo-green-100 active:scale-95 dark:bg-zindo-green-500/10 dark:text-emerald-400"
        >
          Exact
        </button>
        {NOTES.map((note) => (
          <button
            key={note}
            type="button"
            onClick={() => giveNote(note)}
            className={`h-11 rounded-lg border text-sm font-bold tabular-nums transition-colors active:scale-95 ${
              note >= total
                ? "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                : "border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            {note.toLocaleString("fr-FR")}
          </button>
        ))}
      </div>

      {given !== null && total > 0 && (
        <div
          aria-live="polite"
          className={`flex items-baseline justify-between rounded-lg px-3 py-2 ${
            change >= 0
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
          }`}
        >
          <span className="text-sm font-semibold">{change > 0 ? "Monnaie à rendre" : change === 0 ? "Compte juste" : "Il manque"}</span>
          <span className="text-2xl font-bold tracking-tight tabular-nums">
            {change === 0 ? "Rien à rendre" : formatMoney(Math.abs(change), currency)}
          </span>
        </div>
      )}
    </div>
  );
}

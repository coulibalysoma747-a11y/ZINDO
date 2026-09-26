"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

type Op = "+" | "−" | "×" | "÷";

function apply(a: number, b: number, op: Op) {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

function show(n: number) {
  if (!Number.isFinite(n)) return "Erreur";
  return (Math.round(n * 100) / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

/**
 * Calculatrice de la caisse (flag calculatrice_caisse) : diviser l'addition,
 * savoir ce qu'il reste à ajouter… sans quitter l'écran. Démarre sur le total
 * du panier ; « Montant reçu » recopie le résultat dans le champ de paiement.
 */
export function PosCalculator({
  onClose,
  total,
  onUseAsAmountReceived,
}: {
  onClose: () => void;
  total: number;
  onUseAsAmountReceived?: (value: number) => void;
}) {
  // Monté à chaque ouverture : repart toujours du total du panier.
  const [display, setDisplay] = useState(String(total));
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true);

  const value = Number(display.replace(",", "."));

  function digit(d: string) {
    if (display === "Erreur" || fresh) {
      setDisplay(d === "," ? "0," : d);
      setFresh(false);
      return;
    }
    if (d === "," && display.includes(",")) return;
    setDisplay(display === "0" && d !== "," ? d : display + d);
  }

  function chooseOp(next: Op) {
    const current = acc !== null && op && !fresh ? apply(acc, value, op) : value;
    setAcc(current);
    setDisplay(String(current).replace(".", ","));
    setOp(next);
    setFresh(true);
  }

  function equals() {
    if (acc === null || !op) return;
    const result = apply(acc, value, op);
    setDisplay(Number.isFinite(result) ? String(Math.round(result * 100) / 100).replace(".", ",") : "Erreur");
    setAcc(null);
    setOp(null);
    setFresh(true);
  }

  function clear() {
    setDisplay("0");
    setAcc(null);
    setOp(null);
    setFresh(true);
  }

  function backspace() {
    if (fresh || display === "Erreur") return clear();
    setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
  }

  const key = "h-12 rounded-lg text-lg font-semibold transition-colors active:scale-95";
  const num = `${key} bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700`;
  const opKey = (o: Op) =>
    `${key} ${op === o && fresh ? "bg-zindo-green-600 text-white" : "bg-zindo-green-50 text-zindo-green-700 hover:bg-zindo-green-100 dark:bg-zindo-green-500/10 dark:text-emerald-400"}`;

  return (
    <Modal open onClose={onClose} title="Calculatrice">
      <div className="space-y-3">
        <div className="rounded-lg bg-zinc-900 px-4 py-3 text-right dark:bg-slate-950">
          <p className="h-4 text-xs text-zinc-400 tabular-nums">{acc !== null && op ? `${show(acc)} ${op}` : ""}</p>
          <p className="truncate text-3xl font-bold tabular-nums text-white">
            {display === "Erreur" ? display : show(value)}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button type="button" className={`${key} bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400`} onClick={clear}>
            C
          </button>
          <button type="button" className={num} onClick={backspace} aria-label="Effacer le dernier chiffre">
            ⌫
          </button>
          <button type="button" className={num} onClick={() => { setDisplay(String(total)); setFresh(true); }} title="Reprendre le total du panier">
            Total
          </button>
          <button type="button" className={opKey("÷")} onClick={() => chooseOp("÷")}>÷</button>
          {["7", "8", "9"].map((d) => (
            <button key={d} type="button" className={num} onClick={() => digit(d)}>{d}</button>
          ))}
          <button type="button" className={opKey("×")} onClick={() => chooseOp("×")}>×</button>
          {["4", "5", "6"].map((d) => (
            <button key={d} type="button" className={num} onClick={() => digit(d)}>{d}</button>
          ))}
          <button type="button" className={opKey("−")} onClick={() => chooseOp("−")}>−</button>
          {["1", "2", "3"].map((d) => (
            <button key={d} type="button" className={num} onClick={() => digit(d)}>{d}</button>
          ))}
          <button type="button" className={opKey("+")} onClick={() => chooseOp("+")}>+</button>
          <button type="button" className={num} onClick={() => digit("0")}>0</button>
          <button type="button" className={num} onClick={() => digit("00")}>00</button>
          <button type="button" className={num} onClick={() => digit(",")}>,</button>
          <button type="button" className={`${key} bg-zindo-green-600 text-white hover:bg-zindo-green-700`} onClick={equals}>
            =
          </button>
        </div>
        {onUseAsAmountReceived && (
          <button
            type="button"
            disabled={!Number.isFinite(value) || value < 0}
            onClick={() => {
              onUseAsAmountReceived(Math.round(value));
              onClose();
            }}
            className="h-11 w-full rounded-lg border border-zindo-green-600 text-sm font-semibold text-zindo-green-700 hover:bg-zindo-green-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-zindo-green-500/10"
          >
            Mettre {Number.isFinite(value) ? show(Math.round(value)) : ""} dans « Montant reçu »
          </button>
        )}
      </div>
    </Modal>
  );
}

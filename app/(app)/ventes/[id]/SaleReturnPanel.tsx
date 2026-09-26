"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Undo2, Minus, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select, Textarea } from "@/components/ui/Input";
import { formatMoney } from "@/lib/format";
import { createSaleReturnAction, type RefundMethod } from "@/lib/actions/sale-returns";

type Line = {
  key: string;
  name: string;
  unitLabel: string | null;
  soldQty: number;
  returnedQty: number;
  unitRefund: number;
};

const REFUND_LABELS: Record<RefundMethod, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile money",
  CARTE: "Carte bancaire",
  AUTRE: "Autre",
};

const QUICK_REASONS = ["Article défectueux", "Erreur de modèle ou de taille", "Le client a changé d'avis"];

/**
 * Retour / échange (flag retour_partiel) : bandeau au-dessus du ticket ou de
 * la facture — bouton de retour sur une vente, lien vers la vente d'origine
 * sur un bon de retour. Voir lib/actions/sale-returns.ts.
 */
export function SaleReturnPanel({
  saleId,
  currency,
  isCancelled,
  original,
  returns,
  lines,
  hasVehicleUnits,
  remainingDebt,
}: {
  saleId: string;
  currency: string;
  isCancelled: boolean;
  original: { id: string; number: string } | null;
  returns: { id: string; number: string; total: number; status: string }[];
  lines: Line[];
  hasVehicleUnits: boolean;
  remainingDebt: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<RefundMethod>("ESPECES");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ returnId: string; number: string; debtReduced: number; cashRefund: number } | null>(null);
  const [pending, startTransition] = useTransition();

  if (original) {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
        <Undo2 className="h-4 w-4 shrink-0" />
        <span>
          <strong>Bon de retour</strong> — articles repris sur la vente{" "}
          <Link href={`/ventes/${original.id}`} className="font-semibold underline">
            {original.number}
          </Link>
          .
        </span>
      </div>
    );
  }

  const available = (l: Line) => l.soldQty - l.returnedQty;
  const canReturn = !isCancelled && !hasVehicleUnits && lines.some((l) => available(l) > 0);
  const activeReturns = returns.filter((r) => r.status !== "ANNULEE");
  if (!canReturn && activeReturns.length === 0) return null;

  const refund = Math.round(lines.reduce((s, l) => s + (qty[l.key] ?? 0) * l.unitRefund, 0));
  const debtPart = Math.min(refund, remainingDebt);
  const cashPart = refund - debtPart;

  function setLineQty(l: Line, value: number) {
    setQty((q) => ({ ...q, [l.key]: Math.max(0, Math.min(available(l), Math.floor(value) || 0)) }));
  }

  function close() {
    setOpen(false);
    setQty({});
    setReason("");
    setError(null);
    if (done) router.refresh();
    setDone(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createSaleReturnAction({
        saleId,
        lines: Object.entries(qty).map(([key, quantity]) => ({ key, quantity })),
        refundMethod: method,
        reason,
      });
      if (!result.success) return setError(result.error);
      setDone({ returnId: result.returnId, number: result.number, debtReduced: result.debtReduced, cashRefund: result.cashRefund });
    });
  }

  return (
    <div className="mb-4 space-y-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 print:hidden dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-zinc-600">
          {activeReturns.length > 0 ? "Retours sur cette vente :" : "Le client rapporte un article ?"}
        </p>
        {canReturn && (
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Undo2 className="h-4 w-4" /> Retour / échange
          </Button>
        )}
      </div>
      {activeReturns.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {activeReturns.map((r) => (
            <li key={r.id}>
              <Link
                href={`/ventes/${r.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 font-medium text-amber-900 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300"
              >
                {r.number} <span className="tabular-nums">{formatMoney(r.total, currency)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={close} title="Retour / échange d'articles">
        {done ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-semibold">Retour {done.number} enregistré, stock réintégré.</p>
                {done.cashRefund > 0 && (
                  <p>
                    À rendre au client : <strong>{formatMoney(done.cashRefund, currency)}</strong> ({REFUND_LABELS[method]}).
                  </p>
                )}
                {done.debtReduced > 0 && <p>Dette du client réduite de {formatMoney(done.debtReduced, currency)}.</p>}
              </div>
            </div>
            <p className="text-sm text-zinc-600">Pour un échange, faites maintenant une nouvelle vente avec l&apos;article choisi.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push(`/ventes/${done.returnId}`)}>
                Voir le bon de retour
              </Button>
              <Button type="button" onClick={() => router.push("/ventes")}>
                Faire l&apos;échange
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-slate-800 dark:border-slate-700">
              {lines.map((l) => {
                const max = available(l);
                const value = qty[l.key] ?? 0;
                return (
                  <li key={l.key} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {l.name}
                        {l.unitLabel && <span className="ml-1.5 text-xs text-zinc-500">({l.unitLabel})</span>}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Vendu {l.soldQty}
                        {l.returnedQty > 0 && ` · déjà rendu ${l.returnedQty}`} · {formatMoney(Math.round(l.unitRefund), currency)} l&apos;unité
                      </p>
                    </div>
                    {max > 0 ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Rendre un ${l.name} de moins`}
                          onClick={() => setLineQty(l, value - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-slate-700"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={max}
                          aria-label={`Quantité rendue de ${l.name}`}
                          value={value}
                          onChange={(e) => setLineQty(l, Number(e.target.value))}
                          className="h-8 w-12 rounded-lg border border-zinc-300 text-center text-sm tabular-nums dark:border-slate-700 dark:bg-slate-900"
                        />
                        <button
                          type="button"
                          aria-label={`Rendre un ${l.name} de plus`}
                          onClick={() => setLineQty(l, value + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-slate-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-zinc-400">Tout rendu</span>
                    )}
                  </li>
                );
              })}
            </ul>

            <div>
              <label htmlFor="returnReason" className="mb-1.5 block text-[13px] font-semibold text-zinc-700">
                Motif du retour
              </label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      reason === r
                        ? "border-zindo-green-600 bg-zindo-green-50 text-zindo-green-800"
                        : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-slate-700"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Textarea id="returnReason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
            </div>

            <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/40">
              {debtPart > 0 && (
                <div className="flex justify-between text-zinc-700">
                  <span>Déduit de la dette du client</span>
                  <span className="tabular-nums">{formatMoney(debtPart, currency)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between font-semibold text-zinc-900">
                <span>À rendre au client</span>
                <span className="text-lg tabular-nums">{formatMoney(cashPart, currency)}</span>
              </div>
            </div>

            {cashPart > 0 && (
              <div>
                <label htmlFor="refundMethod" className="mb-1.5 block text-[13px] font-semibold text-zinc-700">
                  Rendu en
                </label>
                <Select id="refundMethod" value={method} onChange={(e) => setMethod(e.target.value as RefundMethod)}>
                  {(Object.keys(REFUND_LABELS) as RefundMethod[]).map((m) => (
                    <option key={m} value={m}>
                      {REFUND_LABELS[m]}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={close}>
                Fermer
              </Button>
              <Button type="button" disabled={pending || refund <= 0 || !reason.trim()} onClick={submit}>
                {pending ? "Enregistrement..." : "Valider le retour"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

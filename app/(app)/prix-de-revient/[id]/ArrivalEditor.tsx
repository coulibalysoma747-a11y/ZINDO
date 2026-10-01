"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, Copy, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProductPicker } from "@/components/products/ProductPicker";
import { formatMoney } from "@/lib/format";
import {
  computeLandedCosts,
  effectiveRule,
  lineWarnings,
  linePrice,
  marginOf,
  newPurchasePrice,
  type CostExpense,
  type CostLine,
  type MarginMode,
  type ShareRule,
} from "@/lib/landed-cost";
import type { ArrivalExpenseRow, ArrivalItemRow, ArrivalRow, PriceHistoryRow } from "@/lib/cost-arrivals-data";
import {
  addArrivalExpenseAction,
  addArrivalItemAction,
  applyArrivalAction,
  deleteArrivalAction,
  duplicateArrivalAction,
  getProductPriceHistoryAction,
  importPurchaseAction,
  removeArrivalExpenseAction,
  removeArrivalItemAction,
  revertArrivalAction,
  updateArrivalAction,
  updateArrivalExpenseAction,
  updateArrivalItemAction,
  type CostResult,
} from "@/lib/actions/cost-arrivals";

const RULE_LABELS: Record<ShareRule, string> = {
  VALUE: "À la valeur",
  WEIGHT: "Au poids",
  QUANTITY: "À la quantité",
  VOLUME: "Au volume",
  MANUAL: "À la main",
};
const RULE_HINTS: Record<ShareRule, string> = {
  VALUE: "L'article cher porte plus (douane, taxes, assurance).",
  WEIGHT: "Le lourd porte plus (camion, fret). Saisissez le poids d'une unité.",
  QUANTITY: "Chaque unité porte la même part.",
  VOLUME: "L'encombrant porte plus. Saisissez le volume d'une unité.",
  MANUAL: "Vous fixez la part de chaque ligne.",
};
const MARGIN_LABELS: Record<MarginMode, string> = {
  ADD_PERCENT: "Ajouter un %",
  KEEP_PERCENT: "Garder un % sur la vente",
  ADD_AMOUNT: "Ajouter un montant",
  FIXED_PRICE: "Prix imposé (je fixe le prix)",
};
const STATUS_LABELS = { BROUILLON: "Brouillon", EN_COURS: "En cours d'application", APPLIQUE: "Appliqué", RETABLI: "Prix rétablis" } as const;

const num = (v: string): number => Number(v.replace(/\s/g, "").replace(",", "."));
const sameNumber = (a: number | null, b: number | null) => (a ?? null) === (b ?? null);

type Props = {
  arrival: ArrivalRow;
  items: ArrivalItemRow[];
  expenses: ArrivalExpenseRow[];
  suppliers: { id: string; name: string }[];
  purchases: { id: string; label: string }[];
  currency: string;
};

export function ArrivalEditor({ arrival, items, expenses, suppliers, purchases, currency }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<null | "apply" | "revert" | "delete">(null);
  const [manualFor, setManualFor] = useState<string | null>(null);
  const [manualDraft, setManualDraft] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<{ name: string; rows: PriceHistoryRow[] | null } | null>(null);
  const [newExpense, setNewExpense] = useState<{ label: string; amount: string; rule: ShareRule }>({ label: "", amount: "", rule: "VALUE" });

  const draft = arrival.status === "BROUILLON";
  const locked = !draft;
  const fx = arrival.fxRate > 0 ? arrival.fxRate : 1;

  function run(task: () => Promise<CostResult>, after?: (r: CostResult) => void) {
    setNotice(null);
    startTransition(async () => {
      const result = await task();
      if (result.error) setNotice({ tone: "error", text: result.error });
      else {
        if (result.success && result.success !== "Enregistré") setNotice({ tone: "ok", text: result.success });
        after?.(result);
        router.refresh();
      }
    });
  }

  // --- Calcul en direct (les mêmes fonctions que le serveur utilise pour appliquer) ---------------
  const computed = useMemo(() => {
    const lines: CostLine[] = items.map((i) => ({ id: i.id, quantity: i.quantity, unitPrice: i.unitPrice * fx, weight: i.weight, volume: i.volume }));
    const exps: CostExpense[] = expenses.map((e) => ({
      id: e.id,
      label: e.label,
      amount: e.amount * fx,
      rule: e.rule,
      manual: e.manualShares ? Object.fromEntries(Object.entries(e.manualShares).map(([k, v]) => [k, v * fx])) : undefined,
    }));
    const costs = computeLandedCosts(lines, exps);
    const margin = { mode: arrival.marginMode, value: arrival.marginValue };
    const rows = items.map((item, index) => {
      const cost = costs[index];
      const unitCost = locked && item.unitCostApplied !== null ? item.unitCostApplied : cost.unitCost;
      const oldPurchase = locked && item.oldPurchasePrice !== null ? item.oldPurchasePrice : item.currentPurchasePrice;
      const oldSale = locked && item.oldSalePrice !== null ? item.oldSalePrice : item.currentSalePrice;
      const oldQty = arrival.stockMode === "ENTRER_STOCK" ? item.currentStock : Math.max(0, item.currentStock - item.quantity);
      const newPurchase =
        locked && item.newPurchasePrice !== null
          ? item.newPurchasePrice
          : newPurchasePrice({ oldQty, oldPrice: oldPurchase, newQty: item.quantity, newUnitCost: unitCost, averageWithOld: arrival.averageWithOld });
      const suggested = linePrice(unitCost, margin, arrival.roundingStep, oldSale);
      const newSale = locked && item.newSalePrice !== null ? item.newSalePrice : item.applySalePrice ? (item.salePriceOverride ?? suggested) : oldSale;
      return {
        item,
        cost,
        unitCost,
        oldPurchase,
        newPurchase,
        oldSale,
        suggested,
        newSale,
        margin: marginOf(unitCost, newSale),
        warnings: lineWarnings({ unitCost, salePrice: newSale, oldSalePrice: oldSale }),
      };
    });
    const totals = {
      goods: costs.reduce((s, c) => s + c.goods, 0),
      expenses: costs.reduce((s, c) => s + c.expenses, 0),
      total: costs.reduce((s, c) => s + c.total, 0),
    };
    return { rows, costs, totals };
  }, [items, expenses, fx, arrival.marginMode, arrival.marginValue, arrival.roundingStep, arrival.stockMode, arrival.averageWithOld, locked]);

  const lossCount = computed.rows.filter((r) => r.newSale < r.unitCost).length;
  const warningCount = computed.rows.reduce((s, r) => s + r.warnings.length, 0);

  // --- Historique des prix d'un produit ------------------------------------------------------------
  useEffect(() => {
    if (!history || history.rows !== null) return;
    let alive = true;
    const item = items.find((i) => i.name === history.name);
    if (!item) return;
    getProductPriceHistoryAction(item.productId).then((rows) => {
      if (alive) setHistory({ name: history.name, rows });
    });
    return () => {
      alive = false;
    };
  }, [history, items]);

  const saveSetting = (patch: Parameters<typeof updateArrivalAction>[1]) => run(() => updateArrivalAction(arrival.id, patch));

  return (
    <div className="space-y-5 pb-24">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{arrival.name}</h1>
            <Badge tone={arrival.status === "APPLIQUE" ? "emerald" : arrival.status === "EN_COURS" ? "amber" : "zinc"}>{STATUS_LABELS[arrival.status]}</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {new Date(arrival.arrivalDate).toLocaleDateString("fr-FR")}
            {arrival.reference ? ` · ${arrival.reference}` : ""} · {arrival.locationName}
            {arrival.supplierName ? ` · ${arrival.supplierName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={pending} onClick={() => run(() => duplicateArrivalAction(arrival.id), (r) => r.id && router.push(`/prix-de-revient/${r.id}`))}>
            <Copy className="h-4 w-4" /> Copier
          </Button>
          {draft && (
            <Button variant="outline" disabled={pending} onClick={() => setConfirm("delete")}>
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          )}
        </div>
      </div>

      {locked && (
        <p className="rounded-xl bg-zinc-100 p-3 text-sm text-zinc-700">
          {arrival.status === "EN_COURS"
            ? "L'application de cet arrivage a été interrompue. Cliquez sur « Appliquer » pour la reprendre : les lignes déjà faites ne seront pas refaites."
            : "Cet arrivage est verrouillé pour garder une trace fiable. Vous pouvez le copier pour en refaire un semblable."}
        </p>
      )}
      {notice && (
        <p className={`rounded-xl p-3 text-sm ${notice.tone === "ok" ? "bg-zindo-green-50 text-zindo-green-900" : "bg-red-50 text-red-800"}`}>{notice.text}</p>
      )}

      {draft && (
        <Card>
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="block text-xs font-medium text-zinc-600">
                Nom
                <Input key={arrival.name} defaultValue={arrival.name} disabled={pending} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== arrival.name && saveSetting({ name: e.target.value.trim() })} />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Date d&apos;arrivée
                <Input type="date" key={arrival.arrivalDate} defaultValue={arrival.arrivalDate.slice(0, 10)} disabled={pending} onBlur={(e) => e.target.value && e.target.value !== arrival.arrivalDate.slice(0, 10) && saveSetting({ arrivalDate: e.target.value })} />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Référence
                <Input key={arrival.reference ?? ""} defaultValue={arrival.reference ?? ""} disabled={pending} onBlur={(e) => e.target.value.trim() !== (arrival.reference ?? "") && saveSetting({ reference: e.target.value.trim() || null })} />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Fournisseur
                <Select value={arrival.supplierId ?? ""} disabled={pending} onChange={(e) => saveSetting({ supplierId: e.target.value || null })}>
                  <option value="">Aucun</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Réglage du stock */}
      {draft && (
        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm font-semibold text-zinc-900">Que fait cet arrivage à l&apos;application ?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["PRIX_SEULEMENT", "Changer seulement les prix", "La marchandise est déjà enregistrée ailleurs."],
                  ["ENTRER_STOCK", "Prix et entrée en stock", "La marchandise entre en stock à l'application."],
                ] as const
              ).map(([value, title, text]) => (
                <button
                  key={value}
                  type="button"
                  disabled={pending}
                  onClick={() => arrival.stockMode !== value && saveSetting({ stockMode: value })}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    arrival.stockMode === value ? "border-zindo-green-500 bg-zindo-green-50" : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <span className="block text-sm font-semibold text-zinc-900">{title}</span>
                  <span className="block text-xs text-zinc-600">{text}</span>
                </button>
              ))}
            </div>
            {purchases.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
                <span className="text-sm text-zinc-600">Déjà saisi dans Achats ?</span>
                <Select
                  aria-label="Reprendre un achat"
                  className="!w-auto min-w-[240px]"
                  defaultValue=""
                  disabled={pending}
                  onChange={(e) => e.target.value && run(() => importPurchaseAction(arrival.id, e.target.value))}
                >
                  <option value="">Reprendre un achat…</option>
                  {purchases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Marchandise */}
      <Card>
        <CardBody className="space-y-3">
          <p className="text-sm font-semibold text-zinc-900">Marchandise reçue</p>
          {items.length === 0 ? (
            <p className="text-sm text-zinc-500">Ajoutez les articles reçus avec leur quantité et le prix payé au fournisseur.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-zinc-500">
                    <th className="pb-2 font-medium">Produit</th>
                    <th className="pb-2 text-right font-medium">Quantité</th>
                    <th className="pb-2 text-right font-medium">Prix fournisseur ({arrival.currency})</th>
                    <th className="pb-2 text-right font-medium">Poids / unité (kg)</th>
                    <th className="pb-2 text-right font-medium">Volume / unité (m³)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-zinc-100">
                      <td className="py-2 pr-2">
                        <p className="font-medium text-zinc-900">{item.name}</p>
                        <p className="text-xs text-zinc-500">
                          {item.reference} · {item.currentStock} en stock
                        </p>
                      </td>
                      {(
                        [
                          ["quantity", item.quantity],
                          ["unitPrice", item.unitPrice],
                          ["weight", item.weight],
                          ["volume", item.volume],
                        ] as const
                      ).map(([field, value]) => (
                        <td key={`${field}-${value}`} className="py-2 pl-2">
                          <Input
                            className="!w-24 text-right tabular-nums sm:!w-28"
                            inputMode="decimal"
                            defaultValue={value ?? ""}
                            disabled={locked || pending}
                            aria-label={field}
                            onBlur={(e) => {
                              const raw = e.target.value.trim();
                              const parsed = raw === "" ? null : num(raw);
                              if (parsed !== null && !Number.isFinite(parsed)) return;
                              if ((field === "quantity" || field === "unitPrice") && parsed === null) return;
                              if (sameNumber(parsed, value ?? null)) return;
                              run(() => updateArrivalItemAction(arrival.id, item.id, { [field]: parsed }));
                            }}
                          />
                        </td>
                      ))}
                      <td className="py-2 pl-2 text-right">
                        {draft && (
                          <button
                            type="button"
                            aria-label="Retirer la ligne"
                            disabled={pending}
                            onClick={() => run(() => removeArrivalItemAction(arrival.id, item.id))}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {draft && (
            <div className="max-w-xl pt-1">
              <ProductPicker
                locationId={arrival.locationId}
                currency={currency}
                placeholder="Ajouter un article : nom, référence ou code-barres…"
                onSelect={(p) => run(() => addArrivalItemAction(arrival.id, p.id, { quantity: 1, unitPrice: p.purchasePrice }))}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Frais */}
      <Card>
        <CardBody className="space-y-3">
          <p className="text-sm font-semibold text-zinc-900">Frais d&apos;approche</p>
          <p className="text-xs text-zinc-500">Transport, douane, manutention, assurance… Chaque frais choisit comment il est partagé entre les articles.</p>
          {expenses.length === 0 && <p className="text-sm text-zinc-500">Aucun frais pour le moment.</p>}
          {expenses.map((e) => {
            const effective = effectiveRule(
              e.rule,
              items.map((i) => ({ id: i.id, quantity: i.quantity, unitPrice: i.unitPrice, weight: i.weight, volume: i.volume })),
              { id: e.id, label: e.label, amount: e.amount, rule: e.rule, manual: e.manualShares ?? undefined }
            );
            return (
              <div key={`${e.id}-${e.amount}-${e.label}`} className="space-y-1.5 rounded-xl border border-zinc-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="!w-44"
                    defaultValue={e.label}
                    disabled={locked || pending}
                    aria-label="Nom du frais"
                    onBlur={(ev) => ev.target.value.trim() && ev.target.value.trim() !== e.label && run(() => updateArrivalExpenseAction(arrival.id, e.id, { label: ev.target.value.trim() }))}
                  />
                  <Input
                    className="!w-32 text-right tabular-nums"
                    inputMode="decimal"
                    defaultValue={e.amount}
                    disabled={locked || pending}
                    aria-label="Montant"
                    onBlur={(ev) => {
                      const v = num(ev.target.value);
                      if (Number.isFinite(v) && v >= 0 && v !== e.amount) run(() => updateArrivalExpenseAction(arrival.id, e.id, { amount: v }));
                    }}
                  />
                  <span className="text-xs text-zinc-500">{arrival.currency}</span>
                  <Select
                    className="!w-auto"
                    aria-label="Règle de partage"
                    value={e.rule}
                    disabled={locked || pending}
                    onChange={(ev) => run(() => updateArrivalExpenseAction(arrival.id, e.id, { rule: ev.target.value as ShareRule }))}
                  >
                    {(Object.keys(RULE_LABELS) as ShareRule[]).map((r) => (
                      <option key={r} value={r}>
                        {RULE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                  {e.rule === "MANUAL" && draft && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setManualDraft(Object.fromEntries(items.map((i) => [i.id, String(e.manualShares?.[i.id] ?? "")])));
                        setManualFor(e.id);
                      }}
                    >
                      Fixer les parts
                    </Button>
                  )}
                  {draft && (
                    <button
                      type="button"
                      aria-label="Retirer le frais"
                      disabled={pending}
                      onClick={() => run(() => removeArrivalExpenseAction(arrival.id, e.id))}
                      className="ml-auto rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-zinc-500">{RULE_HINTS[e.rule]}</p>
                {effective !== e.rule && (
                  <p className="flex items-center gap-1 text-xs font-medium text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {e.rule === "MANUAL" ? "Parts non fixées" : e.rule === "WEIGHT" ? "Poids manquants" : "Volumes manquants"} : ce frais est partagé à la quantité en attendant.
                  </p>
                )}
              </div>
            );
          })}
          {draft && (
            <form
              className="flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-3"
              onSubmit={(ev) => {
                ev.preventDefault();
                const amount = num(newExpense.amount);
                if (!newExpense.label.trim() || !Number.isFinite(amount) || amount < 0) {
                  setNotice({ tone: "error", text: "Donnez un nom et un montant au frais." });
                  return;
                }
                run(
                  () => addArrivalExpenseAction(arrival.id, { label: newExpense.label.trim(), amount, rule: newExpense.rule }),
                  () => setNewExpense({ label: "", amount: "", rule: newExpense.rule })
                );
              }}
            >
              <Input className="!w-44" list="frais-usuels" placeholder="Transport, douane…" value={newExpense.label} onChange={(e) => setNewExpense({ ...newExpense, label: e.target.value })} />
              <datalist id="frais-usuels">
                {["Transport", "Douane", "Manutention", "Déchargement", "Assurance", "Change", "Commission"].map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
              <Input className="!w-32 text-right tabular-nums" inputMode="decimal" placeholder="Montant" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} />
              <Select className="!w-auto" aria-label="Règle de partage" value={newExpense.rule} onChange={(e) => setNewExpense({ ...newExpense, rule: e.target.value as ShareRule })}>
                {(Object.keys(RULE_LABELS) as ShareRule[]).map((r) => (
                  <option key={r} value={r}>
                    {RULE_LABELS[r]}
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="outline" disabled={pending}>
                Ajouter le frais
              </Button>
            </form>
          )}
        </CardBody>
      </Card>

      {/* Marge */}
      <Card>
        <CardBody className="space-y-4">
          <p className="text-sm font-semibold text-zinc-900">Votre marge et vos prix</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-zinc-600">Façon de calculer</span>
              <Select value={arrival.marginMode} disabled={locked || pending} onChange={(e) => saveSetting({ marginMode: e.target.value as MarginMode })}>
                {(Object.keys(MARGIN_LABELS) as MarginMode[]).map((m) => (
                  <option key={m} value={m}>
                    {MARGIN_LABELS[m]}
                  </option>
                ))}
              </Select>
            </label>
            {arrival.marginMode !== "FIXED_PRICE" && (
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-zinc-600">{arrival.marginMode === "ADD_AMOUNT" ? "Montant ajouté" : "Pourcentage"}</span>
                <Input
                  key={`${arrival.marginMode}-${arrival.marginValue}`}
                  inputMode="decimal"
                  className="text-right tabular-nums"
                  defaultValue={arrival.marginValue}
                  disabled={locked || pending}
                  onBlur={(e) => {
                    const v = num(e.target.value);
                    if (Number.isFinite(v) && v >= 0 && v !== arrival.marginValue) saveSetting({ marginValue: v });
                  }}
                />
              </label>
            )}
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-zinc-600">Arrondir le prix à</span>
              <Select value={String(arrival.roundingStep)} disabled={locked || pending} onChange={(e) => saveSetting({ roundingStep: Number(e.target.value) })}>
                {[1, 5, 10, 25, 50, 100, 500].map((s) => (
                  <option key={s} value={s}>
                    {s === 1 ? "Au franc" : `${s} F`}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                [true, "Moyenne avec l'ancien stock (recommandé)", "L'ancien et le nouveau sont mélangés au prorata des quantités : la marge reste juste sur ce qui reste en rayon."],
                [false, "Coût de cet arrivage seulement", "Plus simple à suivre, mais la marge est sous-estimée sur les anciens articles tant qu'ils ne sont pas écoulés."],
              ] as const
            ).map(([value, title, text]) => (
              <button
                key={String(value)}
                type="button"
                disabled={locked || pending}
                onClick={() => arrival.averageWithOld !== value && saveSetting({ averageWithOld: value })}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  arrival.averageWithOld === value ? "border-zindo-green-500 bg-zindo-green-50" : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <span className="block text-sm font-semibold text-zinc-900">{title}</span>
                <span className="block text-xs text-zinc-600">{text}</span>
              </button>
            ))}
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer text-zinc-600">Réglages avancés : devise étrangère</summary>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="block text-xs font-medium text-zinc-600">
                Devise de saisie
                <Input className="!w-28" defaultValue={arrival.currency} disabled={locked || pending} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== arrival.currency && saveSetting({ currency: e.target.value.trim().toUpperCase() })} />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                1 {arrival.currency} vaut combien en {currency === "XOF" ? "FCFA" : currency} ?
                <Input
                  className="!w-32 text-right tabular-nums"
                  inputMode="decimal"
                  defaultValue={arrival.fxRate}
                  disabled={locked || pending}
                  onBlur={(e) => {
                    const v = num(e.target.value);
                    if (Number.isFinite(v) && v > 0 && v !== arrival.fxRate) saveSetting({ fxRate: v });
                  }}
                />
              </label>
              <p className="max-w-sm text-xs text-zinc-500">Saisissez marchandise et frais dans cette devise : tout est converti. En FCFA, laissez 1.</p>
            </div>
          </details>
        </CardBody>
      </Card>

      {/* Résultat */}
      {items.length > 0 && (
        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm font-semibold text-zinc-900">Résultat, ligne par ligne</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-zinc-500">
                    <th className="pb-2 font-medium">Produit</th>
                    <th className="pb-2 text-right font-medium">Marchandise</th>
                    <th className="pb-2 text-right font-medium">Frais</th>
                    <th className="pb-2 text-right font-medium">Prix de revient</th>
                    <th className="pb-2 text-right font-medium">Prix d&apos;achat</th>
                    <th className="pb-2 text-right font-medium">Prix de vente</th>
                    <th className="pb-2 text-right font-medium">Marge</th>
                    <th className="pb-2 text-center font-medium">Appliquer</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.rows.map((r) => (
                    <tr key={r.item.id} className="border-t border-zinc-100 align-top">
                      <td className="py-2 pr-2">
                        <p className="font-medium text-zinc-900">{r.item.name}</p>
                        <button
                          type="button"
                          onClick={() => setHistory({ name: r.item.name, rows: null })}
                          className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800"
                        >
                          <Clock className="h-3 w-3" /> Historique des prix
                        </button>
                        {r.warnings.map((w) => (
                          <p key={w} className="mt-1 flex items-start gap-1 text-xs font-medium text-amber-700">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {w}
                          </p>
                        ))}
                      </td>
                      <td className="py-2 text-right tabular-nums text-zinc-600">{formatMoney(r.cost.goods, currency)}</td>
                      <td className="py-2 text-right tabular-nums text-zinc-600">{formatMoney(r.cost.expenses, currency)}</td>
                      <td className="py-2 text-right tabular-nums font-semibold text-zinc-900">{formatMoney(Math.round(r.unitCost), currency)}</td>
                      <td className="py-2 text-right tabular-nums text-xs">
                        <span className="text-zinc-400">{formatMoney(r.oldPurchase, currency)}</span>
                        <br />
                        <span className="font-semibold text-zinc-900">→ {formatMoney(r.newPurchase, currency)}</span>
                      </td>
                      <td className="py-2 text-right">
                        <span className="block text-xs tabular-nums text-zinc-400">{formatMoney(r.oldSale, currency)}</span>
                        <Input
                          key={`${r.item.id}-${r.newSale}-${r.item.applySalePrice}`}
                          className="!w-28 text-right font-semibold tabular-nums"
                          inputMode="decimal"
                          defaultValue={r.newSale}
                          disabled={locked || pending || !r.item.applySalePrice}
                          aria-label="Prix de vente"
                          onBlur={(e) => {
                            const v = num(e.target.value);
                            if (!Number.isFinite(v) || v < 0 || v === r.newSale) return;
                            run(() => updateArrivalItemAction(arrival.id, r.item.id, { salePriceOverride: v }));
                          }}
                        />
                        {draft && r.item.salePriceOverride !== null && (
                          <button type="button" className="mt-0.5 text-xs text-zinc-500 underline" onClick={() => run(() => updateArrivalItemAction(arrival.id, r.item.id, { salePriceOverride: null }))}>
                            Reprendre le prix conseillé
                          </button>
                        )}
                      </td>
                      <td className={`py-2 text-right tabular-nums ${r.margin.amount < 0 ? "font-semibold text-red-600" : "text-emerald-700"}`}>
                        {formatMoney(Math.round(r.margin.amount), currency)}
                        <span className="block text-xs text-zinc-500">
                          {r.margin.onCost.toFixed(0)} % du coût · {r.margin.onSale.toFixed(0)} % du prix
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#0f7a4a]"
                          checked={r.item.applySalePrice}
                          disabled={locked || pending}
                          aria-label="Appliquer le prix de vente"
                          onChange={(e) => run(() => updateArrivalItemAction(arrival.id, r.item.id, { applySalePrice: e.target.checked }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-zinc-200 font-semibold text-zinc-900">
                    <td className="pt-3">Total</td>
                    <td className="pt-3 text-right tabular-nums">{formatMoney(computed.totals.goods, currency)}</td>
                    <td className="pt-3 text-right tabular-nums">{formatMoney(computed.totals.expenses, currency)}</td>
                    <td className="pt-3 text-right tabular-nums" colSpan={2}>
                      {formatMoney(computed.totals.total, currency)}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="text-xs text-zinc-500">
              « Appliquer » décoché : le prix d&apos;achat est mis à jour (pour que votre marge soit juste), mais le prix de vente reste celui d&apos;avant.
            </p>
          </CardBody>
        </Card>
      )}

      {/* Barre d'action */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur md:left-60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-600">
            Total sorti de votre poche : <b className="tabular-nums text-zinc-900">{formatMoney(computed.totals.total, currency)}</b>
            {draft && warningCount > 0 && <span className="ml-2 font-medium text-amber-700">· {warningCount} point(s) à regarder</span>}
          </p>
          {arrival.status === "APPLIQUE" ? (
            <Button variant="outline" disabled={pending} onClick={() => setConfirm("revert")}>
              <Undo2 className="h-4 w-4" /> Remettre les anciens prix
            </Button>
          ) : (
            <Button disabled={pending || items.length === 0} onClick={() => setConfirm("apply")}>
              {arrival.status === "EN_COURS" ? "Reprendre l'application" : "Appliquer les prix"}
            </Button>
          )}
        </div>
      </div>

      {/* Fenêtres */}
      <Modal open={confirm === "apply"} onClose={() => !pending && setConfirm(null)} title="Appliquer cet arrivage ?">
        <div className="space-y-3 text-left text-sm leading-relaxed text-zinc-700">
          <p>
            {arrival.stockMode === "ENTRER_STOCK"
              ? `Le stock de ${items.length} article(s) augmentera des quantités reçues, et les prix d'achat et de vente du catalogue seront mis à jour.`
              : `Seuls les prix changent : le stock n'est pas touché, la marchandise étant déjà enregistrée.`}
          </p>
          {lossCount > 0 && <p className="font-medium text-red-700">{lossCount} article(s) seraient vendus à perte.</p>}
          {warningCount > 0 && lossCount === 0 && <p className="font-medium text-amber-700">{warningCount} point(s) à regarder sont signalés dans le tableau.</p>}
          <p className="text-zinc-500">Une fois appliqué, l&apos;arrivage est verrouillé. Vous pourrez remettre les anciens prix (jamais le stock).</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={() => setConfirm(null)}>
            Annuler
          </Button>
          <Button disabled={pending} onClick={() => run(() => applyArrivalAction(arrival.id), () => setConfirm(null))}>
            {pending ? "Application…" : "Appliquer"}
          </Button>
        </div>
      </Modal>

      <Modal open={confirm === "revert"} onClose={() => !pending && setConfirm(null)} title="Remettre les anciens prix ?">
        <p className="text-left text-sm leading-relaxed text-zinc-700">
          Les prix d&apos;achat et de vente reviennent à ce qu&apos;ils étaient avant cet arrivage. Le stock ne bouge pas : la marchandise est bien arrivée. Les articles dont le prix a
          changé depuis sont laissés tels quels.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={() => setConfirm(null)}>
            Annuler
          </Button>
          <Button disabled={pending} onClick={() => run(() => revertArrivalAction(arrival.id), () => setConfirm(null))}>
            {pending ? "En cours…" : "Remettre les anciens prix"}
          </Button>
        </div>
      </Modal>

      <Modal open={confirm === "delete"} onClose={() => !pending && setConfirm(null)} title="Supprimer ce brouillon ?">
        <p className="text-left text-sm text-zinc-700">Le brouillon et ses lignes seront supprimés. Aucun prix ni stock n&apos;a été touché.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={() => setConfirm(null)}>
            Annuler
          </Button>
          <Button disabled={pending} className="!bg-red-600 hover:!bg-red-700" onClick={() => run(() => deleteArrivalAction(arrival.id), () => router.push("/prix-de-revient"))}>
            Supprimer
          </Button>
        </div>
      </Modal>

      <Modal open={manualFor !== null} onClose={() => setManualFor(null)} title="Fixer la part de chaque ligne">
        {manualFor && (
          <div className="space-y-3 text-sm">
            {items.map((i) => (
              <label key={i.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-zinc-700">{i.name}</span>
                <Input
                  className="!w-32 text-right tabular-nums"
                  inputMode="decimal"
                  value={manualDraft[i.id] ?? ""}
                  onChange={(e) => setManualDraft({ ...manualDraft, [i.id]: e.target.value })}
                />
              </label>
            ))}
            <p className="text-xs text-zinc-500">
              Total saisi : {formatMoney(Object.values(manualDraft).reduce((s, v) => s + (Number.isFinite(num(v)) ? num(v) : 0), 0), currency)} · frais :{" "}
              {formatMoney(expenses.find((e) => e.id === manualFor)?.amount ?? 0, currency)}. Si les deux diffèrent, les parts sont ajustées pour que le total reste exact.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setManualFor(null)}>
                Annuler
              </Button>
              <Button
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      updateArrivalExpenseAction(arrival.id, manualFor, {
                        manualShares: Object.fromEntries(Object.entries(manualDraft).map(([k, v]) => [k, Number.isFinite(num(v)) && num(v) > 0 ? num(v) : 0])),
                      }),
                    () => setManualFor(null)
                  )
                }
              >
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={history !== null} onClose={() => setHistory(null)} title={history ? `Historique des prix : ${history.name}` : "Historique"}>
        {history?.rows === null && <p className="text-sm text-zinc-500">Chargement…</p>}
        {history?.rows && history.rows.length === 0 && <p className="text-sm text-zinc-500">Aucun changement de prix enregistré pour ce produit.</p>}
        {history?.rows && history.rows.length > 0 && (
          <ul className="space-y-3 text-left text-sm">
            {history.rows.map((h) => (
              <li key={h.id} className="rounded-lg border border-zinc-200 p-3">
                <p className="font-medium text-zinc-900">
                  {new Date(h.createdAt).toLocaleDateString("fr-FR")} · {h.reason === "ARRIVAGE" ? `Arrivage « ${h.arrivalName ?? "supprimé"} »` : "Anciens prix remis"}
                </p>
                <p className="text-xs text-zinc-600">
                  Achat : {formatMoney(h.oldPurchasePrice ?? 0, currency)} → {formatMoney(h.newPurchasePrice ?? 0, currency)} · Vente : {formatMoney(h.oldSalePrice ?? 0, currency)} →{" "}
                  {formatMoney(h.newSalePrice ?? 0, currency)}
                  {h.stockAtChange !== null ? ` · ${h.stockAtChange} en stock ce jour-là` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

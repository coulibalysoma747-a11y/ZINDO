"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronUp, PackagePlus } from "lucide-react";
import type { SmartRestockResult, SmartRestockRow, RestockUrgency } from "@/lib/restock-engine";
import { createPurchaseOrdersFromRestockAction } from "@/lib/actions/purchase-orders";
import { formatMoney } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Empty";

const URGENCY: Record<RestockUrgency, { label: string; tone: "red" | "amber" | "emerald" | "zinc" }> = {
  URGENT: { label: "🔴 Urgent", tone: "red" },
  PREVOIR: { label: "🟠 À prévoir", tone: "amber" },
  OK: { label: "🟢 OK", tone: "emerald" },
  DORMANT: { label: "⚪ Dormant", tone: "zinc" },
};

type LineState = { selected: boolean; quantity: number; supplierId: string };

export function SmartRestockPlanner({
  result,
  suppliers,
  coverageChoices,
  currency,
}: {
  result: SmartRestockResult;
  suppliers: { id: string; name: string }[];
  coverageChoices: number[];
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState(result.budget ? String(result.budget) : "");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [lines, setLines] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(
      result.rows.map((r) => [r.productId, { selected: r.inBudget, quantity: r.suggestedQty, supplierId: r.supplierId ?? "" }])
    )
  );

  const rowById = useMemo(() => new Map(result.rows.map((r) => [r.productId, r])), [result.rows]);
  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "Sans fournisseur";

  const unitPriceFor = (r: SmartRestockRow, supplierId: string) =>
    r.offers.find((o) => o.supplierId === supplierId)?.unitPrice ?? r.estimatedUnitPrice;

  const summary = useMemo(() => {
    const groups = new Map<string, { count: number; subtotal: number }>();
    for (const [productId, line] of Object.entries(lines)) {
      if (!line.selected || line.quantity <= 0) continue;
      const r = rowById.get(productId)!;
      const g = groups.get(line.supplierId) ?? { count: 0, subtotal: 0 };
      g.count++;
      g.subtotal += line.quantity * unitPriceFor(r, line.supplierId);
      groups.set(line.supplierId, g);
    }
    return groups;
  }, [lines, rowById]);

  const selectedCount = [...summary.values()].reduce((s, g) => s + g.count, 0);
  const selectedTotal = [...summary.values()].reduce((s, g) => s + g.subtotal, 0);

  function update(productId: string, patch: Partial<LineState>) {
    setLines((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }));
  }

  function toggleExpanded(productId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function navigate(coverage: number, budget: string) {
    const params = new URLSearchParams({ couverture: String(coverage) });
    if (Number(budget) > 0) params.set("budget", String(Number(budget)));
    router.push(`/reassort?${params.toString()}`);
  }

  function createOrders() {
    setError(null);
    const selected = Object.entries(lines)
      .filter(([, l]) => l.selected && l.quantity > 0)
      .map(([productId, l]) => ({ productId, quantity: l.quantity, supplierId: l.supplierId }));
    if (selected.length === 0) return setError("Cochez au moins un produit.");
    if (selected.some((l) => !l.supplierId)) return setError("Choisissez un fournisseur pour chaque produit coché.");
    startTransition(async () => {
      const res = await createPurchaseOrdersFromRestockAction({ lines: selected });
      if (!res.success) return setError(res.error);
      router.push("/achats/commandes");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PackagePlus className="h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-slate-100">Réassort intelligent</h1>
            <p className="text-sm text-zinc-500">
              Basé sur vos ventes des 90 derniers jours. Ce sont des conseils : vous gardez le dernier mot.
            </p>
          </div>
        </div>
        <ButtonLink href="/achats/commandes" variant="outline" size="sm">
          Mes demandes et bons de commande
        </ButtonLink>
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-1 text-xs font-medium text-zinc-500">Couvrir combien de jours ?</p>
            <div className="flex gap-1">
              {coverageChoices.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={c === result.coverageDays ? "primary" : "outline"}
                  onClick={() => navigate(c, budgetInput)}
                >
                  {c} jours
                </Button>
              ))}
            </div>
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(result.coverageDays, budgetInput);
            }}
          >
            <div>
              <label htmlFor="budget" className="mb-1 block text-xs font-medium text-zinc-500">
                Budget disponible (facultatif)
              </label>
              <Input
                id="budget"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Ex. 500000"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-40"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Appliquer
            </Button>
          </form>
          {result.budget && (
            <p className="text-sm text-zinc-500">
              Priorité aux produits urgents, puis à ceux qui rapportent le plus de marge.
            </p>
          )}
        </CardBody>
      </Card>

      {result.rows.length === 0 ? (
        <EmptyState title="Rien à recommander" description="Vos stocks couvrent vos ventes prévues." />
      ) : (
        <Card className="divide-y divide-zinc-100 dark:divide-slate-800">
          {result.rows.map((r) => {
            const line = lines[r.productId];
            const carton = r.unitsPerCarton && r.unitsPerCarton > 1 ? r.unitsPerCarton : null;
            const cartons = carton ? Math.ceil(line.quantity / carton) : null;
            const open = expanded.has(r.productId);
            return (
              <CardBody key={r.productId} className={line.selected ? "" : "opacity-60"}>
                <div className="flex flex-wrap items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-emerald-600"
                    checked={line.selected}
                    onChange={(e) => update(r.productId, { selected: e.target.checked })}
                    aria-label={`Commander ${r.name}`}
                  />
                  <div className="min-w-[180px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zinc-900 dark:text-slate-100">{r.name}</p>
                      <Badge tone={URGENCY[r.urgency].tone}>{URGENCY[r.urgency].label}</Badge>
                      {!r.inBudget && <Badge tone="zinc">Hors budget</Badge>}
                    </div>
                    <p className="text-xs text-zinc-500">
                      Réf. {r.reference} · Stock {r.currentStock} · Min. {r.minStock}
                      {r.onOrder > 0 && ` · En commande ${r.onOrder}`}
                      {r.basis === "HISTORIQUE" && ` · ${r.dailySales.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}/jour`}
                    </p>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-slate-300">{r.reasons[0]}</p>
                    {r.warning && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-red-600">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {r.warning}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(r.productId)}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                    >
                      Pourquoi ? {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                    {open && (
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-zinc-600 dark:text-slate-400">
                        {r.reasons.map((reason, i) => (
                          <li key={i}>{reason}</li>
                        ))}
                        {r.supplierReason && <li>{r.supplierReason}</li>}
                      </ul>
                    )}
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <p className="mb-1 text-xs text-zinc-400">{carton ? `Cartons (×${carton})` : `Quantité (${r.unit})`}</p>
                      <Input
                        type="number"
                        min={0}
                        className="w-24"
                        value={carton ? cartons ?? 0 : line.quantity}
                        onChange={(e) => {
                          const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                          update(r.productId, { quantity: carton ? n * carton : n });
                        }}
                      />
                      {carton && <p className="mt-0.5 text-xs text-zinc-500">= {line.quantity} {r.unit}</p>}
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-zinc-400">Fournisseur</p>
                      <Select
                        value={line.supplierId}
                        onChange={(e) => update(r.productId, { supplierId: e.target.value })}
                        className="w-48"
                      >
                        <option value="">— Choisir —</option>
                        {suppliers.map((s) => {
                          const offer = r.offers.find((o) => o.supplierId === s.id);
                          return (
                            <option key={s.id} value={s.id}>
                              {s.name}
                              {offer ? ` · ${formatMoney(offer.unitPrice, currency)}` : ""}
                              {s.id === r.supplierId ? " ★" : ""}
                            </option>
                          );
                        })}
                      </Select>
                    </div>
                  </div>
                </div>
              </CardBody>
            );
          })}
        </Card>
      )}

      {result.dormant.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-slate-300">⚪ Produits dormants — à ne pas recommander</h2>
          <Card className="divide-y divide-zinc-100 dark:divide-slate-800">
            {result.dormant.map((r) => (
              <CardBody key={r.productId} className="text-sm">
                <p className="font-medium text-zinc-900 dark:text-slate-100">
                  {r.name} <span className="text-xs font-normal text-zinc-500">· Stock {r.currentStock}</span>
                </p>
                <p className="text-xs text-zinc-500">{r.reasons.join(" ")}</p>
              </CardBody>
            ))}
          </Card>
        </div>
      )}

      {result.rows.length > 0 && (
        <div className="sticky bottom-0 z-20 rounded-xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-semibold text-zinc-900 dark:text-slate-100">
                {selectedCount} produit(s) · {summary.size} fournisseur(s) · environ {formatMoney(selectedTotal, currency)}
              </p>
              <p className="text-xs text-zinc-500">
                {[...summary.entries()].map(([id, g]) => `${supplierName(id)} (${g.count})`).join(" · ") ||
                  "Aucun produit coché"}
                {" — "}estimation selon les derniers prix connus, les prix ne figurent pas sur la demande.
              </p>
              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>
            <Button onClick={createOrders} disabled={pending || selectedCount === 0}>
              {pending ? "Création..." : "Créer les demandes de prix"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

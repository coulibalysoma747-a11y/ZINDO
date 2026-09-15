"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Calendar } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { formatMoney, formatDate } from "@/lib/format";
import {
  createInstallmentPlanAction,
  payInstallmentAction,
  type InstallmentPlan,
} from "@/lib/actions/installments";

type Row = { dueDate: string; amount: string };

/**
 * Échéancier (acompte + versements datés) d'une vente à crédit/partielle —
 * typiquement une vente d'engin. N'apparaît que si un client est associé à
 * la vente et qu'il reste un solde. Masqué à l'impression (print:hidden) —
 * ce n'est pas une information qui figure sur le ticket/la facture
 * lui-même. Voir lib/actions/installments.ts.
 */
export function InstallmentSection({
  saleId,
  remaining,
  currency,
  plan,
}: {
  saleId: string;
  remaining: number;
  currency: string;
  plan: InstallmentPlan | null;
}) {
  if (remaining <= 0 && !plan) return null;

  return (
    <Card className="print:hidden">
      <CardHeader>
        <h2 className="font-semibold text-zinc-900">Échéancier</h2>
      </CardHeader>
      <CardBody>{plan ? <PlanList plan={plan} currency={currency} /> : <PlanBuilder saleId={saleId} remaining={remaining} currency={currency} />}</CardBody>
    </Card>
  );
}

function PlanBuilder({ saleId, remaining, currency }: { saleId: string; remaining: number; currency: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([{ dueDate: "", amount: String(remaining) }]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sum = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function handleSubmit() {
    setError(null);
    const parsed = rows.map((r) => ({ dueDate: r.dueDate, amount: Number(r.amount) }));
    if (parsed.some((r) => !r.dueDate || !r.amount || r.amount <= 0)) {
      setError("Renseignez une date et un montant positif pour chaque échéance");
      return;
    }
    startTransition(async () => {
      const result = await createInstallmentPlanAction(saleId, parsed);
      if (result.error) setError(result.error);
    });
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Calendar className="h-4 w-4" /> Configurer un échéancier
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        Reste à payer : <span className="font-semibold text-zinc-900">{formatMoney(remaining, currency)}</span> —
        la somme des échéances doit correspondre exactement à ce montant.
      </p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <Field label="Date d'échéance" htmlFor={`due-${i}`}>
              <Input id={`due-${i}`} type="date" value={row.dueDate} onChange={(e) => updateRow(i, { dueDate: e.target.value })} />
            </Field>
            <Field label="Montant" htmlFor={`amt-${i}`}>
              <Input
                id={`amt-${i}`}
                type="number"
                min={0}
                value={row.amount}
                onChange={(e) => updateRow(i, { amount: e.target.value })}
                className="w-32"
              />
            </Field>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                className="mb-2 rounded-lg p-2 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" variant="outline" onClick={() => setRows((prev) => [...prev, { dueDate: "", amount: "" }])}>
          <Plus className="h-3.5 w-3.5" /> Ajouter une échéance
        </Button>
        <p className={`text-sm ${sum === remaining ? "text-zindo-green-600" : "text-red-600"}`}>
          Total : {formatMoney(sum, currency)} / {formatMoney(remaining, currency)}
        </p>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "Enregistrement..." : "Créer l'échéancier"}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

function PlanList({ plan, currency }: { plan: InstallmentPlan; currency: string }) {
  return (
    <ul className="divide-y divide-zinc-100">
      {plan.installments.map((inst) => {
        const remaining = Math.max(0, inst.amount - inst.paidAmount);
        const isPaid = remaining <= 0;
        const isLate = !isPaid && new Date(inst.dueDate) < new Date();
        return (
          <li key={inst.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Échéance {inst.seq} — {formatDate(new Date(inst.dueDate))}
              </p>
              <p className="text-xs text-zinc-500">
                {formatMoney(inst.paidAmount, currency)} / {formatMoney(inst.amount, currency)} payé
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isPaid ? (
                <Badge tone="emerald">Payée</Badge>
              ) : isLate ? (
                <Badge tone="red">En retard</Badge>
              ) : (
                <Badge tone="amber">À venir</Badge>
              )}
              {!isPaid && <PayButton installmentId={inst.id} remaining={remaining} currency={currency} />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PayButton({ installmentId, remaining, currency }: { installmentId: string; remaining: number; currency: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState("ESPECES");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        Marquer payé
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Input
        type="number"
        min={0}
        max={remaining}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="h-8 w-24 text-sm"
      />
      <Select value={method} onChange={(e) => setMethod(e.target.value)} className="h-8 w-28 text-xs">
        <option value="ESPECES">Espèces</option>
        <option value="MOBILE_MONEY">Mobile Money</option>
        <option value="CARTE">Carte</option>
        <option value="AUTRE">Autre</option>
      </Select>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await payInstallmentAction(installmentId, Number(amount), method);
            if (result.error) setError(result.error);
            else setOpen(false);
          })
        }
      >
        OK
      </Button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-500 hover:underline">
        Annuler
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatMoney, formatDateTime } from "@/lib/format";
import { closeSessionAction } from "@/lib/actions/cash-sessions";
import type { SessionStats } from "@/lib/cash-sessions";

function StatRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "font-semibold text-zinc-900" : "text-zinc-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function CloseSessionForm({
  sessionId,
  sessionNumber,
  locationName,
  cashierName,
  openedAt,
  openingAmount,
  currency,
  stats,
}: {
  sessionId: string;
  sessionNumber: string;
  locationName: string;
  cashierName: string;
  openedAt: string;
  openingAmount: number;
  currency: string;
  stats: SessionStats;
}) {
  const [countedCash, setCountedCash] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const money = (v: number) => formatMoney(v, currency);
  const counted = countedCash === "" ? null : Number(countedCash);
  const variance = counted === null ? null : counted - stats.expectedCash;

  function handleSubmit() {
    setError(null);
    if (counted === null || Number.isNaN(counted) || counted < 0) {
      setError("Indiquez le montant compté en caisse");
      return;
    }
    startTransition(async () => {
      const result = await closeSessionAction({ sessionId, countedCash: counted, note: note || undefined });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/ventes/session/${result.sessionId}`);
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/ventes" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" /> Retour à la caisse
      </Link>

      <div>
        <h1 className="text-xl font-bold text-zinc-900">Clôturer la session {sessionNumber}</h1>
        <p className="text-sm text-zinc-500">
          {locationName} — {cashierName} — ouverte depuis le {formatDateTime(openedAt)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Aperçu de la session (en cours)</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="space-y-1">
            <StatRow label="Nombre de ventes" value={String(stats.salesCount)} />
            <StatRow label="Chiffre d'affaires" value={money(stats.totalRevenue)} bold />
          </div>

          <div className="space-y-1 border-t border-zinc-100 pt-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Encaissement</p>
            <StatRow label="Espèces" value={money(stats.cashCollected)} />
            <StatRow label="Mobile Money" value={money(stats.mobileCollected)} />
            {stats.cardCollected > 0 && <StatRow label="Carte bancaire" value={money(stats.cardCollected)} />}
            {stats.creditCollected > 0 && <StatRow label="Crédit (reçu)" value={money(stats.creditCollected)} />}
            {stats.otherCollected > 0 && <StatRow label="Autre" value={money(stats.otherCollected)} />}
          </div>

          <div className="space-y-1 border-t border-zinc-100 pt-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Marge</p>
            <StatRow label="Marge brute" value={money(stats.grossMargin)} />
            <StatRow label="Dépenses" value={`-${money(stats.expensesTotal)}`} />
            <StatRow label="Marge nette" value={money(stats.netMargin)} bold />
            <StatRow label="Taux de marge net" value={`${stats.marginRate.toFixed(1)} %`} />
          </div>

          <div className="space-y-1 border-t border-zinc-100 pt-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Caisse (espèces)</p>
            <StatRow label="Fond d'ouverture" value={money(openingAmount)} />
            <StatRow label="Caisse attendue" value={money(stats.expectedCash)} bold />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Comptage de caisse</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field
            label="Montant compté en caisse"
            htmlFor="countedCash"
            hint="Comptez physiquement les espèces présentes dans le tiroir-caisse."
          >
            <Input
              id="countedCash"
              type="number"
              min={0}
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              placeholder="0"
              autoFocus
            />
          </Field>

          {variance !== null && (
            <div
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                variance === 0
                  ? "bg-zinc-50 text-zinc-600"
                  : variance > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
              }`}
            >
              Écart : {variance > 0 ? "+" : ""}
              {money(variance)} {variance === 0 ? "(caisse juste)" : variance > 0 ? "(surplus)" : "(manquant)"}
            </div>
          )}

          <Field label="Note (cause de l'écart, facultatif)" htmlFor="note">
            <Textarea
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex : monnaie rendue en trop, dépense non enregistrée..."
            />
          </Field>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <Button className="w-full" size="lg" disabled={pending} onClick={handleSubmit}>
            <Lock className="h-4 w-4" /> {pending ? "Clôture..." : "Clôturer la caisse"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

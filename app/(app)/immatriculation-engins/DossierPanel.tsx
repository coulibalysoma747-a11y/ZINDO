"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { formatMoney } from "@/lib/format";
import { REGISTRATION_STATUSES, REGISTRATION_STATUS_LABELS } from "@/lib/vehicle-registration-status";
import {
  getVehicleRegistrationAction,
  updateVehicleRegistrationAction,
  type VehicleRegistrationDetail,
  type VehicleRegistrationListItem,
} from "@/lib/actions/vehicle-registrations";

export function DossierPanel({
  dossier,
  currency,
  onClose,
}: {
  dossier: VehicleRegistrationListItem;
  currency: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<VehicleRegistrationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [cmcAvailable, setCmcAvailable] = useState(false);
  const [cmcNumber, setCmcNumber] = useState("");
  const [cmcDate, setCmcDate] = useState("");
  const [wwNumber, setWwNumber] = useState("");
  const [wwIssuedDate, setWwIssuedDate] = useState("");
  const [wwHandedToClient, setWwHandedToClient] = useState(false);
  const [ministryDepositDate, setMinistryDepositDate] = useState("");
  const [ministryDepositReference, setMinistryDepositReference] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptReceivedDate, setReceiptReceivedDate] = useState("");
  const [receiptHandedToClient, setReceiptHandedToClient] = useState(false);
  const [grayCardNumber, setGrayCardNumber] = useState("");
  const [grayCardReceivedDate, setGrayCardReceivedDate] = useState("");
  const [grayCardHandedToClient, setGrayCardHandedToClient] = useState(false);
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getVehicleRegistrationAction(dossier.id).then((d) => {
      if (!d) return;
      setDetail(d);
      setCmcAvailable(d.cmcAvailable);
      setCmcNumber(d.cmcNumber ?? "");
      setCmcDate(d.cmcDate ?? "");
      setWwNumber(d.wwNumber ?? "");
      setWwIssuedDate(d.wwIssuedDate ?? "");
      setWwHandedToClient(d.wwHandedToClient);
      setMinistryDepositDate(d.ministryDepositDate ?? "");
      setMinistryDepositReference(d.ministryDepositReference ?? "");
      setReceiptNumber(d.receiptNumber ?? "");
      setReceiptReceivedDate(d.receiptReceivedDate ?? "");
      setReceiptHandedToClient(d.receiptHandedToClient);
      setGrayCardNumber(d.grayCardNumber ?? "");
      setGrayCardReceivedDate(d.grayCardReceivedDate ?? "");
      setGrayCardHandedToClient(d.grayCardHandedToClient);
      setNotes(d.notes ?? "");
      setLoading(false);
    });
  }, [dossier.id]);

  const remaining = detail?.remaining ?? dossier.remaining;
  const isSolde = remaining <= 0;
  const wwSet = !!(wwNumber || wwIssuedDate);
  const receiptSet = !!(receiptNumber || receiptReceivedDate);
  const grayCardSet = !!(grayCardNumber || grayCardReceivedDate);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await updateVehicleRegistrationAction({
        id: dossier.id,
        cmcAvailable,
        cmcNumber,
        cmcDate,
        wwNumber,
        wwIssuedDate,
        wwHandedToClient,
        ministryDepositDate,
        ministryDepositReference,
        receiptNumber,
        receiptReceivedDate,
        receiptHandedToClient,
        grayCardNumber,
        grayCardReceivedDate,
        grayCardHandedToClient,
        notes,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 bg-zindo-ink-900/40 backdrop-blur-[1px]" />

      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-zindo-fade-in dark:bg-slate-900">
        <div className="flex items-start justify-between gap-2 border-b border-zinc-100 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="font-semibold text-zinc-900">Dossier {dossier.saleNumber}</p>
            <p className="text-xs text-zinc-500">
              {dossier.customerLabel} · {dossier.designation} {dossier.chassisNumber ? `· Châssis ${dossier.chassisNumber}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-zinc-400">Chargement...</p>
        ) : (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div className="flex flex-wrap gap-1.5">
                {REGISTRATION_STATUSES.map((s) => (
                  <span
                    key={s}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      s === detail?.status ? "bg-zindo-green-500 text-white" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {REGISTRATION_STATUS_LABELS[s]}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5">
                <div>
                  <p className="text-xs text-zinc-500">Total</p>
                  <p className="font-semibold text-zinc-900">{formatMoney(detail?.total ?? dossier.total, currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Reste</p>
                  <p className={`font-semibold ${remaining > 0 ? "text-red-600" : "text-emerald-600"}`}>{formatMoney(remaining, currency)}</p>
                </div>
                <Badge tone={isSolde ? "emerald" : "amber"}>{isSolde ? "Soldée" : "Non soldé"}</Badge>
              </div>

              <section className="space-y-3">
                <h3 className="border-l-2 border-zindo-green-500 pl-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
                  CMC (mise en circulation)
                </h3>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input type="checkbox" checked={cmcAvailable} onChange={(e) => setCmcAvailable(e.target.checked)} className="h-4 w-4 rounded accent-zindo-green-500" />
                  CMC disponible
                </label>
                <Field label="N° CMC" htmlFor="cmcNumber">
                  <Input id="cmcNumber" value={cmcNumber} onChange={(e) => setCmcNumber(e.target.value)} />
                </Field>
                <Field label="Date CMC" htmlFor="cmcDate">
                  <Input id="cmcDate" type="date" value={cmcDate} onChange={(e) => setCmcDate(e.target.value)} />
                </Field>
              </section>

              <section className="space-y-3">
                <h3 className="border-l-2 border-zindo-green-500 pl-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
                  WW (carte provisoire)
                </h3>
                {!isSolde && (
                  <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Le WW ne peut être émis que si la vente est soldée. Encaissez le reste depuis la page « Vente Engins ».
                  </p>
                )}
                <Field label="N° WW" htmlFor="wwNumber">
                  <Input id="wwNumber" value={wwNumber} onChange={(e) => setWwNumber(e.target.value)} disabled={!isSolde} />
                </Field>
                <Field label="Date WW (émis)" htmlFor="wwIssuedDate">
                  <Input id="wwIssuedDate" type="date" value={wwIssuedDate} onChange={(e) => setWwIssuedDate(e.target.value)} disabled={!isSolde} />
                </Field>
                <label className={`flex items-center gap-2 text-sm ${wwSet ? "text-zinc-700" : "text-zinc-400"}`}>
                  <input
                    type="checkbox"
                    checked={wwHandedToClient}
                    onChange={(e) => setWwHandedToClient(e.target.checked)}
                    disabled={!wwSet}
                    className="h-4 w-4 rounded accent-zindo-green-500"
                  />
                  WW remis au client
                </label>
                {!wwSet && <p className="text-xs text-zinc-400">Renseignez d&apos;abord le WW émis (n° ou date) avant d&apos;enregistrer la remise.</p>}
              </section>

              <section className="space-y-3">
                <h3 className="border-l-2 border-zindo-green-500 pl-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">Dépôt au ministère</h3>
                <Field label="Date de dépôt" htmlFor="ministryDepositDate">
                  <Input id="ministryDepositDate" type="date" value={ministryDepositDate} onChange={(e) => setMinistryDepositDate(e.target.value)} />
                </Field>
                <Field label="Référence dépôt" htmlFor="ministryDepositReference">
                  <Input id="ministryDepositReference" value={ministryDepositReference} onChange={(e) => setMinistryDepositReference(e.target.value)} />
                </Field>
              </section>

              <section className="space-y-3">
                <h3 className="border-l-2 border-zindo-green-500 pl-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">Récépissé</h3>
                <Field label="N° récépissé" htmlFor="receiptNumber">
                  <Input id="receiptNumber" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
                </Field>
                <Field label="Date récépissé (reçu)" htmlFor="receiptReceivedDate">
                  <Input id="receiptReceivedDate" type="date" value={receiptReceivedDate} onChange={(e) => setReceiptReceivedDate(e.target.value)} />
                </Field>
                <label className={`flex items-center gap-2 text-sm ${receiptSet ? "text-zinc-700" : "text-zinc-400"}`}>
                  <input
                    type="checkbox"
                    checked={receiptHandedToClient}
                    onChange={(e) => setReceiptHandedToClient(e.target.checked)}
                    disabled={!receiptSet}
                    className="h-4 w-4 rounded accent-zindo-green-500"
                  />
                  Récépissé remis au client
                </label>
                {!receiptSet && <p className="text-xs text-zinc-400">Renseignez d&apos;abord le récépissé reçu (n° ou date) avant d&apos;enregistrer la remise.</p>}
              </section>

              <section className="space-y-3">
                <h3 className="border-l-2 border-zindo-green-500 pl-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">Carte grise</h3>
                <Field label="N° carte grise" htmlFor="grayCardNumber">
                  <Input id="grayCardNumber" value={grayCardNumber} onChange={(e) => setGrayCardNumber(e.target.value)} />
                </Field>
                <Field label="Date carte grise (reçue)" htmlFor="grayCardReceivedDate">
                  <Input id="grayCardReceivedDate" type="date" value={grayCardReceivedDate} onChange={(e) => setGrayCardReceivedDate(e.target.value)} />
                </Field>
                <label className={`flex items-center gap-2 text-sm ${grayCardSet ? "text-zinc-700" : "text-zinc-400"}`}>
                  <input
                    type="checkbox"
                    checked={grayCardHandedToClient}
                    onChange={(e) => setGrayCardHandedToClient(e.target.checked)}
                    disabled={!grayCardSet}
                    className="h-4 w-4 rounded accent-zindo-green-500"
                  />
                  Carte grise remise au client
                </label>
                {!grayCardSet && <p className="text-xs text-zinc-400">Renseignez d&apos;abord la carte grise reçue (n° ou date) avant d&apos;enregistrer la remise.</p>}
              </section>

              <section className="space-y-2">
                <h3 className="border-l-2 border-zindo-green-500 pl-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">Notes</h3>
                <Textarea rows={3} placeholder="Observations, suivi, contacts..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </section>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            </div>

            <div className="flex gap-2 border-t border-zinc-100 px-5 py-3 dark:border-slate-800">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Annuler
              </Button>
              <Button className="flex-1" disabled={pending} onClick={handleSubmit}>
                {pending ? "Enregistrement..." : "Enregistrer le dossier"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

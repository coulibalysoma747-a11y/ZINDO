"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Lock, UserPlus, Wallet } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Empty";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { ClientFormModal } from "@/app/(app)/clients/ClientFormModal";
import { ReceiptPrintPanel } from "@/app/(app)/ventes/ReceiptPrintPanel";
import { formatMoney, formatDateTime } from "@/lib/format";
import { createSaleAction } from "@/lib/actions/sales";
import { getSaleDocumentAction, type SaleDocument } from "@/lib/actions/receipt";
import { getAvailableVehicleUnitsAction, getVehicleModelsAction, type VehicleModel } from "@/lib/actions/vehicle-units";
import type { CachedBusinessInfo } from "@/lib/offline/db";
import type { PaymentMethod } from "@/lib/db-types";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
};

type SessionInfo = { id: string; number: string; openedAt: string; cashierName: string };
type UnitOption = { id: string; chassisNumber: string; color: string | null };

/**
 * Module dédié à la vente d'un engin (moto) — distinct de l'écran de vente
 * générale (Vente/Caisse) : ici on choisit un modèle puis l'exemplaire
 * précis (châssis) avant d'encaisser, plutôt qu'un panier multi-articles.
 * Réutilise le même moteur de vente (createSaleAction, avec vehicleUnitId)
 * et le même panneau d'impression que le reste de la caisse.
 */
export function VenteEnginForm({
  vehicleModels,
  customers,
  paymentMethods,
  currency,
  locationId,
  locationName,
  autoPrintReceipt: initialAutoPrint,
  session,
  businessInfo,
}: {
  vehicleModels: VehicleModel[];
  customers: { id: string; name: string; phone: string | null }[];
  paymentMethods: { method: PaymentMethod; label: string }[];
  currency: string;
  locationId: string;
  locationName: string;
  autoPrintReceipt: boolean;
  session: SessionInfo;
  businessInfo: CachedBusinessInfo;
}) {
  const [models, setModels] = useState(vehicleModels);
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
  const [availableUnits, setAvailableUnits] = useState<UnitOption[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitOption | null>(null);

  const [unitPrice, setUnitPrice] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(paymentMethods[0]?.method ?? "ESPECES");
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [isFacture, setIsFacture] = useState(false);
  const [autoPrintReceipt] = useState(initialAutoPrint);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [receiptDoc, setReceiptDoc] = useState<Extract<SaleDocument, { success: true }> | null>(null);

  const total = Math.max(0, unitPrice - discount);
  const isCreditOnly = paymentMethod === "CREDIT";
  const amountPaid = isCreditOnly
    ? amountPaidInput === ""
      ? 0
      : Number(amountPaidInput)
    : amountPaidInput === ""
      ? total
      : Number(amountPaidInput);
  const change = Math.max(0, amountPaid - total);
  const remaining = Math.max(0, total - amountPaid);

  function selectModel(model: VehicleModel) {
    setSelectedModel(model);
    setSelectedUnit(null);
    setUnitPrice(model.salePrice);
    setLoadingUnits(true);
    getAvailableVehicleUnitsAction(model.id, locationId)
      .then(setAvailableUnits)
      .finally(() => setLoadingUnits(false));
  }

  function reset() {
    setSelectedModel(null);
    setSelectedUnit(null);
    setAvailableUnits([]);
    setDiscount(0);
    setCustomerId("");
    setAmountPaidInput("");
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    if (!selectedModel || !selectedUnit) {
      setError("Choisissez un engin à vendre");
      return;
    }
    if (remaining > 0 && !customerId) {
      setError("Sélectionnez un client pour une vente à crédit ou un paiement partiel");
      return;
    }
    startTransition(async () => {
      const result = await createSaleAction({
        locationId,
        items: [{ productId: selectedModel.id, quantity: 1, unitPrice, discount, vehicleUnitId: selectedUnit.id }],
        customerId: customerId || undefined,
        discount: 0,
        paymentMethod,
        amountPaid,
        documentType: isFacture ? "FACTURE" : "TICKET",
      });
      if (!result.success) {
        setError(result.error);
        return;
      }

      reset();
      const doc = await getSaleDocumentAction(result.saleId);
      if (doc.success) setReceiptDoc(doc);
      else setError("Vente enregistrée, mais impossible de charger le reçu pour l'impression.");

      getVehicleModelsAction(locationId).then(setModels);
    });
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Vente Engin</h1>
            <p className="text-sm text-zinc-500">
              Boutique : <span className="font-medium text-zinc-700">{locationName}</span> — choisissez un modèle puis
              l&apos;exemplaire précis à vendre.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <Wallet className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Session {session.number} ouverte</p>
              <p className="text-emerald-700">
                {session.cashierName} — depuis {formatDateTime(session.openedAt)}
              </p>
            </div>
            <Link
              href={`/ventes/session/${session.id}/fermer`}
              className="ml-2 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 font-medium text-white hover:bg-emerald-700"
            >
              <Lock className="h-3.5 w-3.5" /> Fermer la caisse
            </Link>
          </div>
        </div>

        {models.length === 0 ? (
          <EmptyState
            title="Aucun engin enregistré"
            description="Créez un produit moto avec le suivi individuel activé, puis enregistrez ses exemplaires (châssis, moteur, couleur, CMC) depuis sa fiche."
            action={<Link href="/produits/nouveau" className="text-sm font-medium text-emerald-600 hover:underline">Créer un produit moto</Link>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-zinc-900">1. Choisir le modèle</h2>
                </CardHeader>
                <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {models.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectModel(m)}
                      disabled={m.availableCount === 0}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        selectedModel?.id === m.id ? "border-zindo-green-400 bg-zindo-green-50" : "border-zinc-200 hover:border-zindo-green-300"
                      }`}
                    >
                      <ProductThumbnail photoUrl={m.photoUrl} name={m.name} size={56} />
                      <span className="text-sm font-medium text-zinc-900">{m.name}</span>
                      <span className="text-xs text-zinc-500">{formatMoney(m.salePrice, currency)}</span>
                      <Badge tone={m.availableCount > 0 ? "emerald" : "zinc"}>{m.availableCount} disponible(s)</Badge>
                    </button>
                  ))}
                </CardBody>
              </Card>

              {selectedModel && (
                <Card>
                  <CardHeader>
                    <h2 className="font-semibold text-zinc-900">2. Choisir l&apos;exemplaire (châssis)</h2>
                  </CardHeader>
                  <CardBody>
                    {loadingUnits ? (
                      <p className="py-4 text-center text-sm text-zinc-400">Chargement...</p>
                    ) : availableUnits.length === 0 ? (
                      <p className="py-4 text-center text-sm text-zinc-500">Aucun exemplaire disponible dans cette boutique.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {availableUnits.map((u) => (
                          <li key={u.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedUnit(u)}
                              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                                selectedUnit?.id === u.id
                                  ? "border-zindo-green-400 bg-zindo-green-50"
                                  : "border-zinc-200 hover:border-zindo-green-300"
                              }`}
                            >
                              <span className="font-mono text-sm font-bold tracking-wide text-zinc-900">{u.chassisNumber}</span>
                              <span className="flex items-center gap-2 text-xs text-zinc-500">
                                {u.color}
                                <ChevronRight className="h-3.5 w-3.5" />
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardBody>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-zinc-900">Client</h2>
                </CardHeader>
                <CardBody className="flex gap-2">
                  <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="flex-1">
                    <option value="">Client de passage</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </Select>
                  <Button type="button" variant="outline" onClick={() => setNewClientOpen(true)}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-zinc-900">Paiement</h2>
                </CardHeader>
                <CardBody className="space-y-3">
                  <Field label="Prix de vente" htmlFor="unitPrice">
                    <Input
                      id="unitPrice"
                      type="number"
                      min={0}
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                      disabled={!selectedUnit}
                    />
                  </Field>
                  <Field label="Remise" htmlFor="discount">
                    <Input
                      id="discount"
                      type="number"
                      min={0}
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                      disabled={!selectedUnit}
                    />
                  </Field>
                  <Field label="Moyen de paiement" htmlFor="paymentMethod">
                    <Select
                      id="paymentMethod"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      disabled={!selectedUnit}
                    >
                      {paymentMethods.map((m) => (
                        <option key={m.method} value={m.method}>
                          {m.label || PAYMENT_LABELS[m.method]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Montant reçu"
                    htmlFor="amountPaid"
                    hint={isCreditOnly ? "Laissez à 0 pour un crédit total" : "Laissez vide pour un paiement exact"}
                  >
                    <Input
                      id="amountPaid"
                      type="number"
                      min={0}
                      value={amountPaidInput}
                      onChange={(e) => setAmountPaidInput(e.target.value)}
                      placeholder={String(total)}
                      disabled={!selectedUnit}
                    />
                  </Field>

                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={isFacture}
                      onChange={(e) => setIsFacture(e.target.checked)}
                      className="h-4 w-4 rounded accent-zindo-green-500"
                    />
                    Générer une facture A4 (au lieu d&apos;un ticket)
                  </label>

                  <div className="space-y-1 border-t border-zinc-100 pt-3 text-sm">
                    <div className="flex justify-between font-semibold text-zinc-900">
                      <span>Total</span>
                      <span>{formatMoney(total, currency)}</span>
                    </div>
                    {change > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Monnaie à rendre</span>
                        <span>{formatMoney(change, currency)}</span>
                      </div>
                    )}
                    {remaining > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Reste à payer (crédit)</span>
                        <span>{formatMoney(remaining, currency)}</span>
                      </div>
                    )}
                  </div>

                  {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

                  <Button className="w-full" size="lg" disabled={pending || !selectedUnit} onClick={handleSubmit}>
                    {pending ? "Enregistrement..." : isFacture ? "Générer la facture" : "Valider la vente"}
                  </Button>
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        <ClientFormModal open={newClientOpen} onClose={() => setNewClientOpen(false)} />
      </div>

      {receiptDoc && (
        <ReceiptPrintPanel doc={receiptDoc} autoPrint={autoPrintReceipt} onClose={() => setReceiptDoc(null)} />
      )}
    </>
  );
}

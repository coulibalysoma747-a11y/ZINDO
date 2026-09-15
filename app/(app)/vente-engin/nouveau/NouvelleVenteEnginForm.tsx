"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Search, UserPlus, Wallet } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Empty";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { ClientFormModal } from "@/app/(app)/clients/ClientFormModal";
import { ReceiptPrintPanel } from "@/app/(app)/ventes/ReceiptPrintPanel";
import { formatMoney, formatDateTime } from "@/lib/format";
import { getSaleDocumentAction, type SaleDocument } from "@/lib/actions/receipt";
import { getAvailableVehicleUnitsAction, getVehicleModelsAction, type VehicleModel } from "@/lib/actions/vehicle-units";
import { createVehicleSaleAction } from "@/lib/actions/vehicle-sales";
import type { PaymentMethod } from "@/lib/db-types";

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
};

const ENGINE_TYPES = ["Moto", "Scooter", "Tricycle", "Vélo électrique", "Autre"];
const CONDITIONS = ["Neuf", "Occasion"];
const CIVILITIES = ["M.", "Mme", "Mlle", "Société", "Autre"];
const ID_TYPES = ["CNIB", "Passeport", "Permis de conduire", "Autre"];

type SessionInfo = { id: string; number: string; openedAt: string; cashierName: string };
type UnitOption = { id: string; chassisNumber: string; engineNumber: string | null; color: string | null };
type CustomerOption = { id: string; name: string; phone: string | null; address: string | null; email: string | null };

/**
 * Vente d'un engin — modèle puis exemplaire (choisi en stock ou saisi
 * directement si l'engin n'a pas encore été enregistré), avec les mentions
 * attendues sur une facture de vente de moto (état, garantie, accessoires
 * remis, pièce d'identité de l'acheteur...). Réutilise createVehicleSaleAction
 * (lui-même bâti sur createSaleAction) et le même panneau d'impression que le
 * reste de la caisse.
 */
export function NouvelleVenteEnginForm({
  vehicleModels,
  customers,
  paymentMethods,
  currency,
  locationId,
  locationName,
  autoPrintReceipt: initialAutoPrint,
  session,
}: {
  vehicleModels: VehicleModel[];
  customers: CustomerOption[];
  paymentMethods: { method: PaymentMethod; label: string }[];
  currency: string;
  locationId: string;
  locationName: string;
  autoPrintReceipt: boolean;
  session: SessionInfo;
}) {
  const [models, setModels] = useState(vehicleModels);
  const [step, setStep] = useState<"model" | "form">("model");
  const [modelSearch, setModelSearch] = useState("");
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null);
  const [availableUnits, setAvailableUnits] = useState<UnitOption[]>([]);

  // Informations de l'engin
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [engineType, setEngineType] = useState("Moto");
  const [condition, setCondition] = useState("Neuf");
  const [brand, setBrand] = useState("");
  const [modelLabel, setModelLabel] = useState("");
  const [designation, setDesignation] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [engineNumber, setEngineNumber] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Informations du client
  const [customerId, setCustomerId] = useState("");
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerCivility, setCustomerCivility] = useState("");
  const [customerProfession, setCustomerProfession] = useState("");
  const [customerIdType, setCustomerIdType] = useState("");
  const [customerIdNumber, setCustomerIdNumber] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Montant & paiement
  const [unitPrice, setUnitPrice] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(paymentMethods[0]?.method ?? "ESPECES");
  const [amountPaidInput, setAmountPaidInput] = useState("");

  // Garantie & accessoires
  const [warranty, setWarranty] = useState(false);
  const [warrantyDuration, setWarrantyDuration] = useState("");
  const [warrantyMileageLimit, setWarrantyMileageLimit] = useState("");
  const [warrantyCoveredItems, setWarrantyCoveredItems] = useState("");
  const [warrantyConditions, setWarrantyConditions] = useState("");
  const [accessoryHelmet, setAccessoryHelmet] = useState(false);
  const [accessoryToolKit, setAccessoryToolKit] = useState(false);
  const [accessoryManual, setAccessoryManual] = useState(false);
  const [accessoryKeys, setAccessoryKeys] = useState(false);
  const [accessorySafetyVest, setAccessorySafetyVest] = useState(false);
  const [accessoryOther, setAccessoryOther] = useState("");

  // Observations & référence
  const [internalReference, setInternalReference] = useState("");
  const [observations, setObservations] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [receiptDoc, setReceiptDoc] = useState<Extract<SaleDocument, { success: true }> | null>(null);

  const total = Math.max(0, unitPrice * quantity);
  const isCreditOnly = paymentMethod === "CREDIT";
  const amountPaid = isCreditOnly
    ? amountPaidInput === ""
      ? 0
      : Number(amountPaidInput)
    : amountPaidInput === ""
      ? total
      : Number(amountPaidInput);
  const remaining = Math.max(0, total - amountPaid);

  const filteredModels = models.filter((m) => m.name.toLowerCase().includes(modelSearch.trim().toLowerCase()));

  function selectModel(model: VehicleModel) {
    setSelectedModel(model);
    setSelectedUnitId("");
    setUnitPrice(model.salePrice);
    setBrand(model.brand ?? "");
    setModelLabel(model.name);
    setDesignation(model.name);
    setChassisNumber("");
    setEngineNumber("");
    setColor("");
    getAvailableVehicleUnitsAction(model.id, locationId).then(setAvailableUnits);
    setStep("form");
  }

  function selectUnit(unitId: string) {
    setSelectedUnitId(unitId);
    const unit = availableUnits.find((u) => u.id === unitId);
    setChassisNumber(unit?.chassisNumber ?? "");
    setEngineNumber(unit?.engineNumber ?? "");
    setColor(unit?.color ?? "");
  }

  function selectCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((c) => c.id === id);
    if (c) {
      setCustomerName(c.name);
      setCustomerPhone(c.phone ?? "");
      setCustomerAddress(c.address ?? "");
      setCustomerEmail(c.email ?? "");
    }
  }

  function handleSubmit() {
    setError(null);
    if (!selectedModel) {
      setError("Choisissez un engin à vendre");
      return;
    }
    if (!chassisNumber.trim()) {
      setError("Le numéro de châssis est requis");
      return;
    }
    if (!customerName.trim() && remaining > 0) {
      setError("Renseignez le nom du client pour une vente à crédit ou un paiement partiel");
      return;
    }
    startTransition(async () => {
      const result = await createVehicleSaleAction({
        productId: selectedModel.id,
        locationId,
        vehicleUnitId: selectedUnitId || undefined,
        engineType,
        condition,
        brand,
        modelLabel,
        designation,
        chassisNumber,
        engineNumber,
        color,
        quantity,
        unitPrice,
        discount: 0,
        customerId: customerId || undefined,
        customerName,
        customerCivility,
        customerProfession,
        customerIdType,
        customerIdNumber,
        customerAddress,
        customerPhone,
        customerEmail,
        paymentMethod,
        amountPaid,
        documentType: "FACTURE",
        warranty,
        warrantyDuration,
        warrantyMileageLimit,
        warrantyCoveredItems,
        warrantyConditions,
        accessoryHelmet,
        accessoryToolKit,
        accessoryManual,
        accessoryKeys,
        accessorySafetyVest,
        accessoryOther,
        internalReference,
        observations,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }

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
            {step === "form" ? (
              <button
                type="button"
                onClick={() => setStep("model")}
                className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
              >
                <ArrowLeft className="h-4 w-4" /> Choisir l&apos;engin
              </button>
            ) : (
              <Link href="/vente-engin" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
                <ArrowLeft className="h-4 w-4" /> Retour
              </Link>
            )}
            <h1 className="mt-2 text-xl font-bold text-zinc-900">{step === "model" ? "Choisir l'engin" : "Nouvelle vente d'engin"}</h1>
            <p className="text-sm text-zinc-500">
              Boutique : <span className="font-medium text-zinc-700">{locationName}</span>
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

        {step === "model" ? (
          models.length === 0 ? (
            <EmptyState
              title="Aucun engin enregistré"
              description="Créez un produit moto avec le suivi individuel activé depuis la fiche produit."
              action={<Link href="/produits/nouveau" className="text-sm font-medium text-emerald-600 hover:underline">Créer un produit moto</Link>}
            />
          ) : (
            <Card>
              <CardBody className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Rechercher un engin..."
                    className="pl-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {filteredModels.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectModel(m)}
                      className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 p-3 text-center transition-colors hover:border-zindo-green-300"
                    >
                      <ProductThumbnail photoUrl={m.photoUrl} name={m.name} size={56} />
                      <span className="text-sm font-medium text-zinc-900">{m.name}</span>
                      <span className="text-xs text-zinc-500">{formatMoney(m.salePrice, currency)}</span>
                      <Badge tone={m.availableCount > 0 ? "emerald" : "zinc"}>{m.availableCount} disponible(s)</Badge>
                    </button>
                  ))}
                </div>
              </CardBody>
            </Card>
          )
        ) : (
          selectedModel && (
            <div className="space-y-4">
              <Card className="flex items-center gap-3 p-3">
                <ProductThumbnail photoUrl={selectedModel.photoUrl} name={selectedModel.name} size={48} />
                <div className="flex-1">
                  <p className="font-semibold text-zinc-900">{selectedModel.name}</p>
                  <p className="text-xs text-zinc-500">Engin sélectionné</p>
                </div>
                <button type="button" onClick={() => setStep("model")} className="text-sm font-medium text-emerald-600 hover:underline">
                  Changer
                </button>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-zinc-900">Informations de l&apos;engin</h2>
                </CardHeader>
                <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Type d'engin" htmlFor="engineType">
                    <Select id="engineType" value={engineType} onChange={(e) => setEngineType(e.target.value)}>
                      {ENGINE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="État" htmlFor="condition">
                    <Select id="condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
                      {CONDITIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Marque" htmlFor="brand">
                    <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
                  </Field>
                  <Field label="Modèle" htmlFor="modelLabel">
                    <Input id="modelLabel" value={modelLabel} onChange={(e) => setModelLabel(e.target.value)} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Désignation" htmlFor="designation">
                      <Input id="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Moto à vendre" htmlFor="unit">
                      <Select id="unit" value={selectedUnitId} onChange={(e) => selectUnit(e.target.value)}>
                        <option value="">Saisie manuelle (aucune moto choisie)</option>
                        {availableUnits.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.chassisNumber} {u.color ? `— ${u.color}` : ""}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <Field label="N° châssis" htmlFor="chassisNumber">
                    <Input id="chassisNumber" value={chassisNumber} onChange={(e) => setChassisNumber(e.target.value)} required />
                  </Field>
                  <Field label="N° moteur" htmlFor="engineNumber">
                    <Input id="engineNumber" value={engineNumber} onChange={(e) => setEngineNumber(e.target.value)} />
                  </Field>
                  <Field label="Couleur" htmlFor="color">
                    <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} />
                  </Field>
                  <Field label="Quantité" htmlFor="quantity">
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </Field>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-zinc-900">Informations du client</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="flex gap-2">
                    <Select value={customerId} onChange={(e) => selectCustomer(e.target.value)} className="flex-1">
                      <option value="">Choisir un client existant (facultatif)</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""}
                        </option>
                      ))}
                    </Select>
                    <Button type="button" variant="outline" onClick={() => setNewClientOpen(true)}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Nom / Structure *" htmlFor="customerName">
                      <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                    </Field>
                    <Field label="Civilité" htmlFor="customerCivility">
                      <Select id="customerCivility" value={customerCivility} onChange={(e) => setCustomerCivility(e.target.value)}>
                        <option value="">—</option>
                        {CIVILITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Profession / Fonction" htmlFor="customerProfession">
                      <Input id="customerProfession" value={customerProfession} onChange={(e) => setCustomerProfession(e.target.value)} />
                    </Field>
                    <Field label="Type de pièce" htmlFor="customerIdType">
                      <Select id="customerIdType" value={customerIdType} onChange={(e) => setCustomerIdType(e.target.value)}>
                        <option value="">—</option>
                        {ID_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="N° de pièce" htmlFor="customerIdNumber">
                      <Input id="customerIdNumber" value={customerIdNumber} onChange={(e) => setCustomerIdNumber(e.target.value)} />
                    </Field>
                    <Field label="Adresse" htmlFor="customerAddress">
                      <Input id="customerAddress" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                    </Field>
                    <Field label="Téléphone" htmlFor="customerPhone">
                      <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                    </Field>
                    <Field label="E-mail" htmlFor="customerEmail">
                      <Input id="customerEmail" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                    </Field>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-zinc-900">Montant &amp; paiement</h2>
                </CardHeader>
                <CardBody className="space-y-3">
                  <Field label="Prix unitaire (CFA) *" htmlFor="unitPrice">
                    <Input id="unitPrice" type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value) || 0)} required />
                  </Field>
                  <Field label="Mode de paiement" htmlFor="paymentMethod">
                    <Select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
                      {paymentMethods.map((m) => (
                        <option key={m.method} value={m.method}>
                          {m.label || PAYMENT_LABELS[m.method]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Montant payé (CFA)" htmlFor="amountPaid" hint={isCreditOnly ? "Laissez à 0 pour un crédit total" : "Laissez vide pour un paiement exact"}>
                    <Input id="amountPaid" type="number" min={0} value={amountPaidInput} onChange={(e) => setAmountPaidInput(e.target.value)} placeholder={String(total)} />
                  </Field>
                  <div className="space-y-1 border-t border-zinc-100 pt-3 text-sm">
                    <div className="flex justify-between text-zinc-600">
                      <span>Reste à payer</span>
                      <span className="font-semibold text-zinc-900">{formatMoney(remaining, currency)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-zindo-green-500 px-4 py-3 text-white">
                    <span className="text-sm font-semibold uppercase tracking-wide">Total à payer</span>
                    <span className="text-lg font-bold">{formatMoney(total, currency)}</span>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-zinc-900">Garantie &amp; accessoires</h2>
                </CardHeader>
                <CardBody className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input type="checkbox" checked={warranty} onChange={(e) => setWarranty(e.target.checked)} className="h-4 w-4 rounded accent-zindo-green-500" />
                    Garantie éventuelle
                  </label>
                  {warranty && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Field label="Durée" htmlFor="warrantyDuration">
                        <Input id="warrantyDuration" value={warrantyDuration} onChange={(e) => setWarrantyDuration(e.target.value)} placeholder="Ex : 3 mois" />
                      </Field>
                      <Field label="Kilométrage limite" htmlFor="warrantyMileageLimit">
                        <Input id="warrantyMileageLimit" value={warrantyMileageLimit} onChange={(e) => setWarrantyMileageLimit(e.target.value)} placeholder="Ex : 1000 km" />
                      </Field>
                      <Field label="Éléments couverts" htmlFor="warrantyCoveredItems" hint="Ex : moteur, transmission">
                        <Input id="warrantyCoveredItems" value={warrantyCoveredItems} onChange={(e) => setWarrantyCoveredItems(e.target.value)} />
                      </Field>
                      <Field label="Conditions" htmlFor="warrantyConditions">
                        <Input id="warrantyConditions" value={warrantyConditions} onChange={(e) => setWarrantyConditions(e.target.value)} />
                      </Field>
                    </div>
                  )}
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Accessoires remis avec la moto</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input type="checkbox" checked={accessoryHelmet} onChange={(e) => setAccessoryHelmet(e.target.checked)} className="h-4 w-4 rounded accent-zindo-green-500" />
                      Casque de protection
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input type="checkbox" checked={accessoryToolKit} onChange={(e) => setAccessoryToolKit(e.target.checked)} className="h-4 w-4 rounded accent-zindo-green-500" />
                      Kit d&apos;outils
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input type="checkbox" checked={accessoryManual} onChange={(e) => setAccessoryManual(e.target.checked)} className="h-4 w-4 rounded accent-zindo-green-500" />
                      Manuel d&apos;utilisation
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input type="checkbox" checked={accessoryKeys} onChange={(e) => setAccessoryKeys(e.target.checked)} className="h-4 w-4 rounded accent-zindo-green-500" />
                      Clés de contact
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input type="checkbox" checked={accessorySafetyVest} onChange={(e) => setAccessorySafetyVest(e.target.checked)} className="h-4 w-4 rounded accent-zindo-green-500" />
                      Gilet de sécurité
                    </label>
                  </div>
                  <Field label="Autre accessoire" htmlFor="accessoryOther">
                    <Input id="accessoryOther" value={accessoryOther} onChange={(e) => setAccessoryOther(e.target.value)} />
                  </Field>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h2 className="font-semibold text-zinc-900">Observations &amp; référence</h2>
                </CardHeader>
                <CardBody className="space-y-3">
                  <Field label="Référence interne" htmlFor="internalReference">
                    <Input id="internalReference" value={internalReference} onChange={(e) => setInternalReference(e.target.value)} />
                  </Field>
                  <Field label="Observations" htmlFor="observations">
                    <Textarea id="observations" rows={3} value={observations} onChange={(e) => setObservations(e.target.value)} />
                  </Field>
                </CardBody>
              </Card>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <Button className="w-full" size="lg" disabled={pending} onClick={handleSubmit}>
                {pending ? "Enregistrement..." : "Générer la facture"}
              </Button>
            </div>
          )
        )}

        <ClientFormModal open={newClientOpen} onClose={() => setNewClientOpen(false)} />
      </div>

      {receiptDoc && (
        <ReceiptPrintPanel doc={receiptDoc} autoPrint={initialAutoPrint} onClose={() => setReceiptDoc(null)} />
      )}
    </>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { FileText, Check, Eye, X, ChevronLeft, ChevronRight } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import { INVOICE_TEMPLATES, type InvoiceTemplateId } from "@/lib/invoice-templates";
import type { BusinessSettings } from "@/lib/business-settings";
import type { FactureData } from "@/components/sales/Facture";
import { InvoiceDocument } from "@/components/sales/InvoiceDocument";

/** Informations réelles du commerce (nom, logo, IFU...) utilisées pour rendre l'aperçu — seuls les articles et le client sont fictifs. */
export type InvoicePreviewBusiness = Pick<
  FactureData,
  | "businessName"
  | "businessActivity"
  | "businessPhone"
  | "businessAddress"
  | "businessEmail"
  | "businessCity"
  | "logoUrl"
  | "tagline"
  | "mobileMoneyInfo"
  | "signerName"
  | "returnPolicy"
  | "ifu"
  | "rccm"
  | "footerMessage"
  | "currency"
>;

type DocumentKind = "facture" | "devis";

function buildPreviewData(business: InvoicePreviewBusiness, templateId: InvoiceTemplateId, kind: DocumentKind): FactureData {
  const items = [
    { reference: "ZND-000001", name: "Article exemple A", unit: "pièce", quantity: 2, unitPrice: 5000, total: 10000 },
    { reference: "ZND-000002", name: "Article exemple B", unit: "pièce", quantity: 1, unitPrice: 3500, total: 3500 },
    { reference: "ZND-000003", name: "Article exemple C", unit: "carton", quantity: 3, unitPrice: 12000, total: 36000 },
  ];
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const discount = 500;
  const total = subtotal - discount;
  if (kind === "devis") {
    return {
      ...business,
      invoiceNumber: "D-000045",
      date: new Date(),
      documentTitle: "Devis",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      customerName: "Client exemple",
      customerPhone: "70 00 00 00",
      items,
      subtotal,
      discount,
      total,
      templateId,
    };
  }
  return {
    ...business,
    invoiceNumber: "V-000123",
    date: new Date(),
    cashierName: "Vendeur",
    customerName: "Client exemple",
    customerPhone: "70 00 00 00",
    items,
    subtotal,
    discount,
    total,
    paymentMethodLabel: "Espèces",
    amountPaid: total,
    change: 0,
    remaining: 0,
    statusLabel: "Facture intégralement réglée",
    templateId,
  };
}

export function InvoiceTemplatePanel({
  settings,
  business,
}: {
  settings: BusinessSettings;
  business: InvoicePreviewBusiness;
}) {
  const [selected, setSelected] = useState(settings.invoiceTemplate as InvoiceTemplateId);
  const [quoteSelected, setQuoteSelected] = useState(settings.quoteTemplate as InvoiceTemplateId | null);
  const [previewId, setPreviewId] = useState<InvoiceTemplateId | null>(null);
  const [previewKind, setPreviewKind] = useState<DocumentKind>("facture");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function choose(id: InvoiceTemplateId) {
    setSelected(id);
    setError(null);
    startTransition(async () => {
      const result = await updateBusinessSettingsAction({ invoiceTemplate: id });
      if (result.error) setError(result.error);
    });
  }

  function chooseQuote(id: InvoiceTemplateId | null) {
    setQuoteSelected(id);
    setError(null);
    startTransition(async () => {
      const result = await updateBusinessSettingsAction({ quoteTemplate: id });
      if (result.error) setError(result.error);
    });
  }

  function openPreview(id: InvoiceTemplateId, kind: DocumentKind) {
    setPreviewKind(kind);
    setPreviewId(id);
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Modèle de facture A4</p>
          <p className="mt-1 text-sm text-zinc-500">
            Choisissez le style visuel utilisé pour vos factures et devis imprimés. Vos informations (logo, IFU/RCCM,
            moyens de paiement...) restent les mêmes quel que soit le modèle. Cliquez sur « Aperçu » pour voir la
            facture avant de choisir.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {INVOICE_TEMPLATES.map((tpl) => {
          const isSelected = selected === tpl.id;
          return (
            <div
              key={tpl.id}
              className={`flex flex-col gap-2 rounded-lg border p-3 transition-colors ${
                isSelected ? "border-zindo-green-500 bg-zindo-green-50" : "border-zinc-200"
              }`}
            >
              <button
                type="button"
                disabled={pending}
                onClick={() => choose(tpl.id)}
                className="flex items-start gap-2.5 text-left"
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    isSelected ? "border-zindo-green-600 bg-zindo-green-600" : "border-zinc-300"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-zinc-900">{tpl.label}</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">{tpl.description}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => openPreview(tpl.id, "facture")}
                className="inline-flex items-center gap-1.5 self-end rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
              >
                <Eye className="h-3.5 w-3.5" /> Aperçu
              </button>
            </div>
          );
        })}
      </div>

      {/* Modèle des devis — indépendant de celui des factures */}
      <div className="mt-4 rounded-lg border border-zinc-200 p-3">
        <p className="text-sm font-semibold text-zinc-900">Modèle des devis</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Vos devis peuvent avoir un style différent de vos factures.
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={quoteSelected ?? ""}
            disabled={pending}
            onChange={(e) => chooseQuote((e.target.value || null) as InvoiceTemplateId | null)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          >
            <option value="">Identique aux factures</option>
            {INVOICE_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => openPreview(quoteSelected ?? selected, "devis")}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <Eye className="h-3.5 w-3.5" /> Aperçu du devis
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {previewId && (
        <InvoicePreviewDialog
          business={business}
          templateId={previewId}
          kind={previewKind}
          isSelected={previewKind === "devis" ? quoteSelected === previewId : selected === previewId}
          pending={pending}
          onNavigate={setPreviewId}
          onChoose={() => {
            if (previewKind === "devis") chooseQuote(previewId);
            else choose(previewId);
            setPreviewId(null);
          }}
          onClose={() => setPreviewId(null)}
        />
      )}
    </div>
  );
}

function InvoicePreviewDialog({
  business,
  templateId,
  kind,
  isSelected,
  pending,
  onNavigate,
  onChoose,
  onClose,
}: {
  business: InvoicePreviewBusiness;
  templateId: InvoiceTemplateId;
  kind: DocumentKind;
  isSelected: boolean;
  pending: boolean;
  onNavigate: (id: InvoiceTemplateId) => void;
  onChoose: () => void;
  onClose: () => void;
}) {
  const index = INVOICE_TEMPLATES.findIndex((t) => t.id === templateId);
  const tpl = INVOICE_TEMPLATES[index];
  const prev = INVOICE_TEMPLATES[(index - 1 + INVOICE_TEMPLATES.length) % INVOICE_TEMPLATES.length];
  const next = INVOICE_TEMPLATES[(index + 1) % INVOICE_TEMPLATES.length];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate(prev.id);
      if (e.key === "ArrowRight") onNavigate(next.id);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onNavigate, prev.id, next.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 print:hidden">
      <div className="animate-zindo-fade-in absolute inset-0 bg-zinc-900/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-zindo-fade-in-up relative flex max-h-full w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
          <button
            type="button"
            onClick={() => onNavigate(prev.id)}
            aria-label="Modèle précédent"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="font-semibold text-zinc-900">
              Aperçu {kind === "devis" ? "du devis" : "de la facture"} : {tpl.label}<span className="text-xs font-normal text-zinc-400">({index + 1}/{INVOICE_TEMPLATES.length})</span>
            </p>
            <p className="truncate text-xs text-zinc-500">Articles et client fictifs — vos informations réelles du commerce.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(next.id)}
            aria-label="Modèle suivant"
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-zinc-100 p-2 sm:p-4">
          <InvoiceDocument data={buildPreviewData(business, templateId, kind)} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Fermer
          </button>
          <button
            type="button"
            disabled={pending || isSelected}
            onClick={onChoose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zindo-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-zindo-green-700 disabled:opacity-60"
          >
            <Check className="h-4 w-4" /> {isSelected ? "Modèle actuel" : kind === "devis" ? "Choisir pour les devis" : "Choisir ce modèle"}
          </button>
        </div>
      </div>
    </div>
  );
}

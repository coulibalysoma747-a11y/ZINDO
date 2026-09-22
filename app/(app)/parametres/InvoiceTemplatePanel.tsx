"use client";

import { useState, useTransition } from "react";
import { FileText, Check } from "lucide-react";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";
import { INVOICE_TEMPLATES, type InvoiceTemplateId } from "@/lib/invoice-templates";
import type { BusinessSettings } from "@/lib/business-settings";

export function InvoiceTemplatePanel({ settings }: { settings: BusinessSettings }) {
  const [selected, setSelected] = useState(settings.invoiceTemplate as InvoiceTemplateId);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Modèle de facture A4</p>
          <p className="mt-1 text-sm text-zinc-500">
            Choisissez le style visuel utilisé pour vos factures et devis imprimés. Vos informations (logo, IFU/RCCM,
            moyens de paiement...) restent les mêmes quel que soit le modèle.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {INVOICE_TEMPLATES.map((tpl) => {
          const isSelected = selected === tpl.id;
          return (
            <button
              key={tpl.id}
              type="button"
              disabled={pending}
              onClick={() => {
                setSelected(tpl.id);
                setError(null);
                startTransition(async () => {
                  const result = await updateBusinessSettingsAction({ invoiceTemplate: tpl.id });
                  if (result.error) setError(result.error);
                });
              }}
              className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                isSelected ? "border-zindo-green-500 bg-zindo-green-50" : "border-zinc-200 hover:bg-zinc-50"
              }`}
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
          );
        })}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { updateBusinessSettingsAction, type ActionState } from "@/lib/actions/settings";

type Business = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  currency: string;
  ticketWidth: string;
  ticketFooter: string;
  qrCodeSize: number;
  defaultMinStock: number;
  logoUrl: string | null;
  invoiceTagline: string | null;
  mobileMoneyInfo: string | null;
  invoiceSignerName: string | null;
  invoiceReturnPolicy: string | null;
};

const QR_SIZE_OPTIONS = [
  { value: 0, label: "Automatique (recommandé)" },
  { value: 80, label: "Petit" },
  { value: 130, label: "Moyen" },
  { value: 180, label: "Grand" },
];

export function BusinessSettingsForm({ business }: { business: Business }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateBusinessSettingsAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <ImageUploadField
        name="logo"
        removeFieldName="removeLogo"
        initialUrl={business.logoUrl}
        label="Logo du commerce"
        hint="Affiché en haut de vos tickets de caisse (JPEG, PNG, WebP — 5 Mo max)."
        size={88}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nom du commerce" htmlFor="name">
          <Input id="name" name="name" defaultValue={business.name} required />
        </Field>
        <Field label="Téléphone" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={business.phone ?? ""} />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" defaultValue={business.email ?? ""} />
        </Field>
        <Field label="Ville" htmlFor="city">
          <Input id="city" name="city" defaultValue={business.city ?? ""} />
        </Field>
        <Field label="Devise" htmlFor="currency">
          <Select id="currency" name="currency" defaultValue={business.currency}>
            <option value="XOF">FCFA (XOF)</option>
            <option value="EUR">Euro (EUR)</option>
            <option value="USD">Dollar US (USD)</option>
          </Select>
        </Field>
        <Field label="Format du ticket" htmlFor="ticketWidth">
          <Select id="ticketWidth" name="ticketWidth" defaultValue={business.ticketWidth}>
            <option value="58mm">Thermique 58mm</option>
            <option value="80mm">Thermique 80mm</option>
            <option value="A4">A4 (imprimante classique)</option>
          </Select>
        </Field>
        <Field
          label="Taille du QR code de vérification"
          htmlFor="qrCodeSize"
          hint="Affiché sur chaque ticket pour permettre de vérifier son authenticité"
        >
          <Select id="qrCodeSize" name="qrCodeSize" defaultValue={business.qrCodeSize}>
            {QR_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Seuil de stock par défaut" htmlFor="defaultMinStock">
          <Input
            id="defaultMinStock"
            name="defaultMinStock"
            type="number"
            min={0}
            defaultValue={business.defaultMinStock}
          />
        </Field>
      </div>
      <Field label="Adresse" htmlFor="address">
        <Input id="address" name="address" defaultValue={business.address ?? ""} />
      </Field>
      <Field label="Message de pied de ticket" htmlFor="ticketFooter">
        <Textarea id="ticketFooter" name="ticketFooter" rows={2} defaultValue={business.ticketFooter} />
      </Field>

      <div className="border-t border-zinc-100 pt-4">
        <p className="mb-3 text-sm font-semibold text-zinc-900">Facture A4</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Slogan (facultatif)" htmlFor="invoiceTagline" hint="Affiché sous le nom du commerce">
            <Input id="invoiceTagline" name="invoiceTagline" defaultValue={business.invoiceTagline ?? ""} />
          </Field>
          <Field label="Info Mobile Money (facultatif)" htmlFor="mobileMoneyInfo" hint="Ex : *144*3*XXXXXXX#">
            <Input id="mobileMoneyInfo" name="mobileMoneyInfo" defaultValue={business.mobileMoneyInfo ?? ""} />
          </Field>
          <Field label="Nom du responsable (facultatif)" htmlFor="invoiceSignerName" hint="Affiché sous la signature">
            <Input id="invoiceSignerName" name="invoiceSignerName" defaultValue={business.invoiceSignerName ?? ""} />
          </Field>
        </div>
        <Field
          label="Politique de retour (facultatif)"
          htmlFor="invoiceReturnPolicy"
          hint="Petite mention affichée en bas de la facture"
        >
          <Textarea
            id="invoiceReturnPolicy"
            name="invoiceReturnPolicy"
            rows={2}
            defaultValue={business.invoiceReturnPolicy ?? ""}
          />
        </Field>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}

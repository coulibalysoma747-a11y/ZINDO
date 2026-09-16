"use client";

import { useActionState, useState } from "react";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { saveOnlineStoreAction, type ActionState } from "@/lib/actions/online-store";

type OnlineStore = {
  storeName: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  coverPhotoUrl: string | null;
  contactPhone: string | null;
  whatsappNumber: string | null;
  address: string | null;
  city: string | null;
  footerMessage: string | null;
  locationId: string | null;
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeDeliveryAbove: number | null;
  deliveryNote: string | null;
  pickupEnabled: boolean;
  payOnDeliveryEnabled: boolean;
  mobileMoneyEnabled: boolean;
  mobileMoneyNumber: string | null;
  minOrderAmount: number;
  showOutOfStock: boolean;
  published: boolean;
};

export function OnlineStoreForm({
  store,
  locations,
}: {
  store: OnlineStore | null;
  locations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveOnlineStoreAction, undefined);
  const [deliveryEnabled, setDeliveryEnabled] = useState(store?.deliveryEnabled ?? false);
  const [mobileMoneyEnabled, setMobileMoneyEnabled] = useState(store?.mobileMoneyEnabled ?? false);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-4 rounded-lg border border-zinc-200 p-3">
        <Field
          label="Adresse de votre boutique en ligne"
          htmlFor="slug"
          hint="C'est le lien que vous partagerez à vos clients. Minuscules, chiffres et tirets uniquement."
        >
          <div className="flex items-center gap-1 text-sm text-zinc-500">
            <span className="whitespace-nowrap">/boutique/</span>
            <Input id="slug" name="slug" defaultValue={store?.slug ?? ""} placeholder="ma-boutique" required />
          </div>
        </Field>
        <label className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-zindo-green-50/40 p-3">
          <input
            type="checkbox"
            name="published"
            defaultChecked={store?.published ?? false}
            className="mt-0.5 h-4 w-4 rounded accent-zindo-green-500"
          />
          <span>
            <span className="block text-sm font-medium text-zinc-900">Mettre ma boutique en ligne</span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Tant que cette case est décochée, le lien ne montre rien : vous pouvez tout préparer tranquillement
              avant d&apos;ouvrir au public.
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900">Présentation</h3>
        <Field label="Nom affiché" htmlFor="storeName">
          <Input id="storeName" name="storeName" defaultValue={store?.storeName ?? ""} required />
        </Field>
        <Field label="Phrase d'accroche (facultatif)" htmlFor="tagline" hint='Ex : "Livraison rapide"'>
          <Input id="tagline" name="tagline" defaultValue={store?.tagline ?? ""} />
        </Field>
        <ImageUploadField
          name="coverPhoto"
          removeFieldName="removeCoverPhoto"
          initialUrl={store?.coverPhotoUrl}
          label="Photo de couverture"
          hint="Format paysage conseillé. La photo est automatiquement allégée avant l'envoi."
        />
        <Field label="Description (facultatif)" htmlFor="description">
          <Textarea id="description" name="description" rows={2} defaultValue={store?.description ?? ""} />
        </Field>
        <Field label="Numéro WhatsApp (facultatif)" htmlFor="whatsappNumber">
          <Input id="whatsappNumber" name="whatsappNumber" defaultValue={store?.whatsappNumber ?? ""} placeholder="+226 XX XX XX XX" />
        </Field>
        <Field label="Téléphone (facultatif)" htmlFor="contactPhone">
          <Input id="contactPhone" name="contactPhone" defaultValue={store?.contactPhone ?? ""} />
        </Field>
        <Field label="Adresse (facultatif)" htmlFor="address">
          <Input id="address" name="address" defaultValue={store?.address ?? ""} />
        </Field>
        <Field label="Ville (facultatif)" htmlFor="city">
          <Input id="city" name="city" defaultValue={store?.city ?? ""} />
        </Field>
        <Field label="Horaires / message (facultatif)" htmlFor="footerMessage" hint={`Ex : horaires d'ouverture, ou "Merci pour votre confiance"`}>
          <Input id="footerMessage" name="footerMessage" defaultValue={store?.footerMessage ?? ""} />
        </Field>
      </div>

      <Field
        label="Boutique / dépôt qui sert les commandes"
        htmlFor="locationId"
        hint="Le stock affiché en ligne sera celui de cet emplacement."
      >
        <Select id="locationId" name="locationId" defaultValue={store?.locationId ?? ""}>
          <option value="">Choisir...</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900">Réception et paiement</h3>

        <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
            <input
              type="checkbox"
              name="deliveryEnabled"
              defaultChecked={store?.deliveryEnabled ?? false}
              onChange={(e) => setDeliveryEnabled(e.target.checked)}
              className="h-4 w-4 rounded accent-zindo-green-500"
            />
            Je livre
          </label>
          <p className="pl-6 text-xs text-zinc-500">Le client saisit son adresse à la commande.</p>
          {deliveryEnabled && (
            <div className="grid grid-cols-1 gap-3 pl-6 sm:grid-cols-2">
              <Field label="Frais de livraison" htmlFor="deliveryFee">
                <Input id="deliveryFee" name="deliveryFee" type="number" min={0} defaultValue={store?.deliveryFee ?? 0} />
              </Field>
              <Field
                label="Livraison gratuite au-delà de (facultatif)"
                htmlFor="freeDeliveryAbove"
                hint="Laisser vide pour ne jamais offrir la livraison gratuite"
              >
                <Input
                  id="freeDeliveryAbove"
                  name="freeDeliveryAbove"
                  type="number"
                  min={0}
                  defaultValue={store?.freeDeliveryAbove ?? ""}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Précision livraison (facultatif)" htmlFor="deliveryNote">
                  <Input id="deliveryNote" name="deliveryNote" defaultValue={store?.deliveryNote ?? ""} />
                </Field>
              </div>
            </div>
          )}
        </div>

        <label className="flex items-start gap-2 rounded-lg border border-zinc-200 p-3">
          <input
            type="checkbox"
            name="pickupEnabled"
            defaultChecked={store?.pickupEnabled ?? false}
            className="mt-0.5 h-4 w-4 rounded accent-zindo-green-500"
          />
          <span>
            <span className="block text-sm font-medium text-zinc-900">Retrait en boutique</span>
            <span className="mt-0.5 block text-xs text-zinc-500">Le client vient chercher sa commande.</span>
          </span>
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-zinc-200 p-3 text-sm font-medium text-zinc-900">
          <input
            type="checkbox"
            name="payOnDeliveryEnabled"
            defaultChecked={store?.payOnDeliveryEnabled ?? true}
            className="h-4 w-4 rounded accent-zindo-green-500"
          />
          Paiement à la livraison / sur place
        </label>

        <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
            <input
              type="checkbox"
              name="mobileMoneyEnabled"
              defaultChecked={store?.mobileMoneyEnabled ?? false}
              onChange={(e) => setMobileMoneyEnabled(e.target.checked)}
              className="h-4 w-4 rounded accent-zindo-green-500"
            />
            Mobile Money
          </label>
          {mobileMoneyEnabled && (
            <div className="pl-6">
              <Field label="Numéro Mobile Money affiché au client" htmlFor="mobileMoneyNumber">
                <Input
                  id="mobileMoneyNumber"
                  name="mobileMoneyNumber"
                  defaultValue={store?.mobileMoneyNumber ?? ""}
                  placeholder="*144*3*XXXXXXX#"
                  required
                />
              </Field>
            </div>
          )}
        </div>

        <Field label="Commande minimum (facultatif)" htmlFor="minOrderAmount">
          <Input id="minOrderAmount" name="minOrderAmount" type="number" min={0} defaultValue={store?.minOrderAmount ?? 0} />
        </Field>

        <label className="flex items-start gap-2 rounded-lg border border-zinc-200 p-3">
          <input
            type="checkbox"
            name="showOutOfStock"
            defaultChecked={store?.showOutOfStock ?? false}
            className="mt-0.5 h-4 w-4 rounded accent-zindo-green-500"
          />
          <span>
            <span className="block text-sm font-medium text-zinc-900">Afficher aussi les articles en rupture</span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              Ils apparaissent grisés, sans bouton d&apos;ajout.
            </span>
          </span>
        </label>
      </div>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Enregistrement..." : "Enregistrer ma vitrine"}
      </Button>
    </form>
  );
}

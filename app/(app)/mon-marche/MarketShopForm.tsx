"use client";

import { useActionState } from "react";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { CountryCityPicker } from "@/components/ui/CountryCityPicker";
import { saveMarketShopAction, type MarketActionState } from "@/lib/actions/market";
import { useKeepValuesOnError } from "@/lib/keep-form-values";

export type MarketShopFormValues = {
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  countryCode: string;
  address: string | null;
  hours: string | null;
  locationId: string | null;
  published: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number;
  deliveryNote: string | null;
  pickupEnabled: boolean;
  payOnDelivery: boolean;
  payOnPickup: boolean;
  mobileMoneyEnabled: boolean;
  orangeMoneyNumber: string | null;
  moovMoneyNumber: string | null;
};

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />
      {label}
    </label>
  );
}

export function MarketShopForm({
  shop,
  locations,
}: {
  shop: MarketShopFormValues;
  locations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<MarketActionState, FormData>(saveMarketShopAction, undefined);
  const keep = useKeepValuesOnError(state);

  return (
    <form onSubmit={keep} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom de la boutique" htmlFor="name">
          <Input id="name" name="name" required defaultValue={shop.name} />
        </Field>
        <Field label="Adresse de la boutique" htmlFor="slug" hint="Lettres, chiffres et tirets : zindo…/marche/boutique/votre-adresse">
          <Input id="slug" name="slug" defaultValue={shop.slug} />
        </Field>
      </div>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" rows={3} defaultValue={shop.description ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <ImageUploadField name="logo" removeFieldName="removeLogo" initialUrl={shop.logoUrl} label="Logo" hint="JPEG, PNG ou WebP." shape="circle" directUploadFolder="marche" />
        <ImageUploadField name="cover" removeFieldName="removeCover" initialUrl={shop.coverUrl} label="Photo de couverture" hint="Une photo large de votre boutique." directUploadFolder="marche" />
      </div>
      <CountryCityPicker countryName="countryCode" defaultCountry={shop.countryCode} defaultCity={shop.city ?? ""} cityRequired />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Téléphone" htmlFor="phone">
          <Input id="phone" name="phone" inputMode="tel" defaultValue={shop.phone ?? ""} />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp">
          <Input id="whatsapp" name="whatsapp" inputMode="tel" defaultValue={shop.whatsapp ?? ""} />
        </Field>
        <Field label="Adresse" htmlFor="address">
          <Input id="address" name="address" defaultValue={shop.address ?? ""} />
        </Field>
        <Field label="Horaires" htmlFor="hours" hint="Exemple : lundi au samedi, 8 h – 19 h">
          <Input id="hours" name="hours" defaultValue={shop.hours ?? ""} />
        </Field>
        <Field label="Stock proposé sur le Marché" htmlFor="locationId" hint="Les quantités affichées sont celles de ce point de vente.">
          <Select id="locationId" name="locationId" defaultValue={shop.locationId ?? locations[0]?.id ?? ""}>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-3">
        <legend className="px-1 text-sm font-semibold text-zinc-800">Livraison et retrait</legend>
        <Check name="pickupEnabled" label="Retrait en boutique" defaultChecked={shop.pickupEnabled} />
        <Check name="deliveryEnabled" label="Je livre" defaultChecked={shop.deliveryEnabled} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Frais de livraison (FCFA)" htmlFor="deliveryFee">
            <Input id="deliveryFee" name="deliveryFee" inputMode="numeric" defaultValue={shop.deliveryFee || ""} />
          </Field>
          <Field label="Zone et délai de livraison" htmlFor="deliveryNote" hint="Exemple : Ouagadougou, sous 24 h">
            <Input id="deliveryNote" name="deliveryNote" defaultValue={shop.deliveryNote ?? ""} />
          </Field>
        </div>
      </fieldset>
      <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-3">
        <legend className="px-1 text-sm font-semibold text-zinc-800">Paiement</legend>
        <Check name="payOnDelivery" label="Paiement à la livraison" defaultChecked={shop.payOnDelivery} />
        <Check name="payOnPickup" label="Paiement au retrait" defaultChecked={shop.payOnPickup} />
        <Check name="mobileMoneyEnabled" label="Mobile Money (le client envoie, puis vous confirmez)" defaultChecked={shop.mobileMoneyEnabled} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Numéro Orange Money" htmlFor="orangeMoneyNumber">
            <Input id="orangeMoneyNumber" name="orangeMoneyNumber" inputMode="tel" defaultValue={shop.orangeMoneyNumber ?? ""} />
          </Field>
          <Field label="Numéro Moov Money" htmlFor="moovMoneyNumber">
            <Input id="moovMoneyNumber" name="moovMoneyNumber" inputMode="tel" defaultValue={shop.moovMoneyNumber ?? ""} />
          </Field>
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <input type="checkbox" name="published" defaultChecked={shop.published} className="h-4 w-4" />
        Boutique visible sur le Marché
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer la boutique"}
      </Button>
    </form>
  );
}

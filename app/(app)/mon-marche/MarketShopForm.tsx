"use client";

import { useActionState } from "react";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
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
  address: string | null;
  hours: string | null;
  locationId: string | null;
  published: boolean;
};

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
        <ImageUploadField name="logo" removeFieldName="removeLogo" initialUrl={shop.logoUrl} label="Logo" hint="JPEG, PNG ou WebP, 5 Mo maximum." shape="circle" />
        <ImageUploadField name="cover" removeFieldName="removeCover" initialUrl={shop.coverUrl} label="Photo de couverture" hint="Une photo large de votre boutique." />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Téléphone" htmlFor="phone">
          <Input id="phone" name="phone" inputMode="tel" defaultValue={shop.phone ?? ""} />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp">
          <Input id="whatsapp" name="whatsapp" inputMode="tel" defaultValue={shop.whatsapp ?? ""} />
        </Field>
        <Field label="Ville" htmlFor="city">
          <Input id="city" name="city" defaultValue={shop.city ?? ""} />
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

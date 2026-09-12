"use client";

import { useActionState, useState } from "react";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { saveOnlineStoreAction, type ActionState } from "@/lib/actions/online-store";
import type { OnlineStore } from "@prisma/client";

export function OnlineStoreForm({
  store,
  locations,
}: {
  store: OnlineStore | null;
  locations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveOnlineStoreAction, undefined);
  const [deliveryEnabled, setDeliveryEnabled] = useState(store?.deliveryEnabled ?? false);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Nom de la boutique" htmlFor="storeName">
        <Input id="storeName" name="storeName" defaultValue={store?.storeName ?? ""} required />
      </Field>
      <Field
        label="Adresse de la boutique en ligne"
        htmlFor="slug"
        hint="Minuscules, chiffres et tirets uniquement — c'est le lien que vous partagerez à vos clients."
      >
        <div className="flex items-center gap-1 text-sm text-zinc-500">
          <span className="whitespace-nowrap">/boutique/</span>
          <Input id="slug" name="slug" defaultValue={store?.slug ?? ""} placeholder="ma-boutique" required />
        </div>
      </Field>
      <Field label="Description (facultatif)" htmlFor="description">
        <Textarea id="description" name="description" rows={2} defaultValue={store?.description ?? ""} />
      </Field>
      <Field label="Téléphone de contact (facultatif)" htmlFor="contactPhone">
        <Input id="contactPhone" name="contactPhone" defaultValue={store?.contactPhone ?? ""} />
      </Field>
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

      <div className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-slate-700">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-900">
          <input
            type="checkbox"
            name="deliveryEnabled"
            defaultChecked={store?.deliveryEnabled ?? false}
            onChange={(e) => setDeliveryEnabled(e.target.checked)}
            className="h-4 w-4 rounded accent-zindo-orange-500"
          />
          Proposer la livraison
        </label>
        {deliveryEnabled && (
          <div className="grid grid-cols-1 gap-3 pl-6 sm:grid-cols-2">
            <Field label="Frais de livraison" htmlFor="deliveryFee">
              <Input
                id="deliveryFee"
                name="deliveryFee"
                type="number"
                min={0}
                defaultValue={store?.deliveryFee ?? 0}
              />
            </Field>
            <Field
              label="Livraison gratuite au-delà de (facultatif)"
              htmlFor="freeDeliveryAbove"
              hint="Laisser vide pour ne jamais offrir la livraison"
            >
              <Input
                id="freeDeliveryAbove"
                name="freeDeliveryAbove"
                type="number"
                min={0}
                defaultValue={store?.freeDeliveryAbove ?? ""}
              />
            </Field>
          </div>
        )}
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-zinc-200 p-3 dark:border-slate-700">
        <input
          type="checkbox"
          name="published"
          defaultChecked={store?.published ?? false}
          className="mt-0.5 h-4 w-4 rounded accent-zindo-orange-500"
        />
        <span>
          <span className="block text-sm font-medium text-zinc-900">Publier la boutique</span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            Tant que cette case n&apos;est pas cochée, votre lien affiche « boutique indisponible » — vous
            pouvez préparer votre catalogue tranquillement avant d&apos;ouvrir au public.
          </span>
        </span>
      </label>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.success}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}

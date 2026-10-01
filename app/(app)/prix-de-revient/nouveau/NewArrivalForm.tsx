"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { createArrivalAction } from "@/lib/actions/cost-arrivals";

export function NewArrivalForm({
  locations,
  defaultLocationId,
  suppliers,
}: {
  locations: { id: string; name: string }[];
  defaultLocationId: string;
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stockMode, setStockMode] = useState<"PRIX_SEULEMENT" | "ENTRER_STOCK">("PRIX_SEULEMENT");
  const today = new Date().toISOString().slice(0, 10);

  function submit(formData: FormData) {
    setError(null);
    formData.set("stockMode", stockMode);
    startTransition(async () => {
      const result = await createArrivalAction(formData);
      if (result.error || !result.id) {
        setError(result.error ?? "Impossible de créer l'arrivage");
        return;
      }
      router.push(`/prix-de-revient/${result.id}`);
    });
  }

  return (
    <form action={submit}>
      <Card>
        <CardBody className="space-y-5">
          <Field label="Nom de l'arrivage" htmlFor="name" hint="Un nom qui vous parle : « Conteneur d'Abidjan d'octobre », « Commande Ouédraogo ».">
            <Input id="name" name="name" required maxLength={120} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date d'arrivée" htmlFor="arrivalDate">
              <Input id="arrivalDate" name="arrivalDate" type="date" defaultValue={today} required />
            </Field>
            <Field label="Référence (facultatif)" htmlFor="reference" hint="N° de facture ou de bon de livraison.">
              <Input id="reference" name="reference" maxLength={60} />
            </Field>
            <Field label="Fournisseur (facultatif)" htmlFor="supplierId">
              <Select id="supplierId" name="supplierId" defaultValue="">
                <option value="">Aucun</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Boutique qui reçoit" htmlFor="locationId">
              <Select id="locationId" name="locationId" defaultValue={defaultLocationId} required>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-zinc-800">Que doit faire cet arrivage ?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["PRIX_SEULEMENT", "Changer seulement les prix", "La marchandise est déjà enregistrée (module Achats, inventaire). Seuls les prix changent."],
                  ["ENTRER_STOCK", "Prix et entrée en stock", "Vous n'avez rien saisi ailleurs : à l'application, la marchandise entre en stock et les prix se mettent à jour."],
                ] as const
              ).map(([value, title, text]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                    stockMode === value ? "border-zindo-green-500 bg-zindo-green-50" : "border-zinc-200 bg-white hover:border-zinc-300"
                  }`}
                >
                  <input type="radio" name="stockModeChoice" className="sr-only" checked={stockMode === value} onChange={() => setStockMode(value)} />
                  <span className="block text-sm font-semibold text-zinc-900">{title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-zinc-600">{text}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Choisissez avec soin : si la marchandise est déjà comptée ailleurs, « Prix et entrée en stock » la compterait deux fois.
            </p>
          </fieldset>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Création…" : "Créer l'arrivage"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}

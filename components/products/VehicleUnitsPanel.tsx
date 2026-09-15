"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import {
  addVehicleUnitAction,
  updateVehicleUnitAction,
  deleteVehicleUnitAction,
  type VehicleUnit,
} from "@/lib/actions/vehicle-units";

type LocationOption = { id: string; name: string };

/**
 * Suivi unitaire des exemplaires d'un produit (moto/engin) : chaque
 * exemplaire a son propre numéro de châssis (identifiant réel du véhicule),
 * moteur, couleur, et une case CMC (Certificat de Mise en Circulation)
 * disponible ou non. Le stock du produit (affiché ailleurs dans l'app,
 * alertes comprises) suit automatiquement le nombre d'exemplaires
 * "EN_STOCK" — voir lib/actions/vehicle-units.ts.
 */
export function VehicleUnitsPanel({
  productId,
  units,
  locations,
  defaultLocationId,
}: {
  productId: string;
  units: VehicleUnit[];
  locations: LocationOption[];
  defaultLocationId?: string;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  const inStock = units.filter((u) => u.status === "EN_STOCK");
  const sold = units.filter((u) => u.status === "VENDU");

  function handleAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addVehicleUnitAction(productId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setFormOpen(false);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {inStock.length} en stock · {sold.length} vendu(s)
        </p>
        <Button size="sm" variant={formOpen ? "outline" : "primary"} onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? (
            "Annuler"
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" /> Ajouter un exemplaire
            </>
          )}
        </Button>
      </div>

      {formOpen && (
        <form action={handleAdd} className="space-y-3 rounded-xl border border-zinc-200 p-4">
          <Field label="Numéro de châssis" htmlFor="chassisNumber">
            <Input id="chassisNumber" name="chassisNumber" required autoFocus className="font-mono text-base tracking-wide" />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Numéro de moteur (facultatif)" htmlFor="engineNumber">
              <Input id="engineNumber" name="engineNumber" className="font-mono" />
            </Field>
            <Field label="Couleur (facultative)" htmlFor="color">
              <Input id="color" name="color" />
            </Field>
          </div>
          <Field label="Boutique" htmlFor="locationId">
            <Select id="locationId" name="locationId" defaultValue={defaultLocationId ?? ""} required>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="cmcAvailable" className="h-4 w-4 rounded accent-zindo-green-500" />
            CMC (Certificat de Mise en Circulation) disponible
          </label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? "Enregistrement..." : "Enregistrer cet exemplaire"}
          </Button>
        </form>
      )}

      {units.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
          Aucun exemplaire enregistré pour le moment.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
          {units.map((u) =>
            editingId === u.id ? (
              <EditRow key={u.id} unit={u} onDone={() => setEditingId(null)} />
            ) : (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-base font-bold tracking-wide text-zinc-900">{u.chassisNumber}</span>
                    <Badge tone={u.status === "EN_STOCK" ? "emerald" : "zinc"}>
                      {u.status === "EN_STOCK" ? "En stock" : "Vendu"}
                    </Badge>
                    {u.cmcAvailable ? (
                      <Badge tone="blue">CMC disponible</Badge>
                    ) : (
                      <Badge tone="amber">CMC non disponible</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {u.engineNumber ? `Moteur ${u.engineNumber}` : "Moteur —"}
                    {u.color ? ` · ${u.color}` : ""} · {u.locationName} · {formatDate(new Date(u.createdAt))}
                  </p>
                </div>
                {u.status === "EN_STOCK" && (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(u.id)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <DeleteButton unitId={u.id} chassisNumber={u.chassisNumber} />
                  </div>
                )}
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

function EditRow({ unit, onDone }: { unit: VehicleUnit; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateVehicleUnitAction(unit.id, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <li className="p-3.5">
      <form action={handleSave} className="space-y-2.5">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <Input name="chassisNumber" defaultValue={unit.chassisNumber} required className="font-mono" placeholder="Châssis" />
          <Input name="engineNumber" defaultValue={unit.engineNumber ?? ""} className="font-mono" placeholder="Moteur" />
          <Input name="color" defaultValue={unit.color ?? ""} placeholder="Couleur" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="cmcAvailable"
              defaultChecked={unit.cmcAvailable}
              className="h-4 w-4 rounded accent-zindo-green-500"
            />
            CMC disponible
          </label>
          <div className="flex gap-1.5">
            <button type="button" onClick={onDone} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100">
              <X className="h-4 w-4" />
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg p-1.5 text-zindo-green-600 hover:bg-zindo-green-50 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </form>
    </li>
  );
}

function DeleteButton({ unitId, chassisNumber }: { unitId: string; chassisNumber: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex items-center gap-1 text-xs">
        <span className="text-zinc-500">Retirer {chassisNumber} ?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteVehicleUnitAction(unitId);
            })
          }
          className="rounded-md bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Oui
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100">
          Non
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
      title="Retirer"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

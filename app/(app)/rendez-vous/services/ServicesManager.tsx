"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, Trash2, X, Pencil } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import { createServiceAction, updateServiceAction, toggleServiceActiveAction, deleteServiceAction, type ActionState, type ServiceRow } from "@/lib/actions/appointments";

function ServiceEditForm({ service, onDone }: { service: ServiceRow; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const res = await updateServiceAction(prev, fd);
    if (res?.success) onDone();
    return res;
  }, undefined);
  return (
    <form action={formAction} className="grid w-full grid-cols-1 gap-2 sm:grid-cols-4">
      <input type="hidden" name="id" value={service.id} />
      <Input name="name" defaultValue={service.name} required autoFocus aria-label="Nom de la prestation" />
      <Input name="durationMinutes" type="number" min={5} step={5} defaultValue={service.durationMinutes} required aria-label="Durée (minutes)" />
      <Input name="price" type="number" min={0} defaultValue={service.price} required aria-label="Prix" />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "..." : "Enregistrer"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          Annuler
        </Button>
      </div>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-4">{state.error}</p>}
    </form>
  );
}

export function ServicesManager({ services, currency, canEdit = false }: { services: ServiceRow[]; currency: string; canEdit?: boolean }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createServiceAction, undefined);
  const [, startTransition] = useTransition();

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleServiceActiveAction(id, !active);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer cette prestation ?")) return;
    startTransition(async () => {
      await deleteServiceAction(id);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {formOpen ? "Annuler" : "Ajouter une prestation"}
        </Button>
      </div>

      {formOpen && (
        <Card>
          <CardBody>
            <form
              action={(fd) => {
                formAction(fd);
                setFormOpen(false);
              }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              <Field label="Nom de la prestation" htmlFor="name">
                <Input id="name" name="name" required autoFocus />
              </Field>
              <Field label="Durée (minutes)" htmlFor="durationMinutes">
                <Input id="durationMinutes" name="durationMinutes" type="number" min={5} step={5} defaultValue={30} required />
              </Field>
              <Field label="Prix" htmlFor="price">
                <Input id="price" name="price" type="number" min={0} defaultValue={0} required />
              </Field>
              <Button type="submit" disabled={pending} className="sm:col-span-3">
                {pending ? "Ajout..." : "Ajouter"}
              </Button>
            </form>
          </CardBody>
        </Card>
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      {services.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">Aucune prestation — ajoutez-en une pour commencer à prendre des rendez-vous.</p>
      ) : (
        <ul className="space-y-2">
          {services.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3">
              {editingId === s.id ? (
                <ServiceEditForm service={s} onDone={() => setEditingId(null)} />
              ) : (
              <>
              <div>
                <p className="font-medium text-zinc-900">{s.name}</p>
                <p className="text-xs text-zinc-500">
                  {s.durationMinutes} min · {formatMoney(s.price, currency)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(s.id, s.active)}
                  className="cursor-pointer"
                >
                  <Badge tone={s.active ? "emerald" : "zinc"}>{s.active ? "Active" : "Désactivée"}</Badge>
                </button>
                {canEdit && (
                  <button type="button" onClick={() => setEditingId(s.id)} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100" aria-label="Modifier">
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button type="button" onClick={() => handleDelete(s.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50" aria-label="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

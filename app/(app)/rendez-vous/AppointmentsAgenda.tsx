"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { formatMoney, formatTime, formatLongDate } from "@/lib/format";
import {
  createAppointmentAction,
  updateAppointmentStatusAction,
  deleteAppointmentAction,
  APPOINTMENT_STATUS_LABELS,
  type ActionState,
  type AppointmentRow,
  type ServiceRow,
} from "@/lib/actions/appointments";
import type { AppointmentStatus } from "@/lib/db-types";

const STATUS_TONE: Record<AppointmentStatus, "zinc" | "blue" | "amber" | "emerald" | "red"> = {
  CONFIRME: "blue",
  TERMINE: "emerald",
  ANNULE: "red",
  ABSENT: "amber",
};

function shiftDay(day: string, delta: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function AppointmentsAgenda({
  day,
  appointments,
  services,
  customers,
  staff,
  locationId,
  currency,
}: {
  day: string;
  appointments: AppointmentRow[];
  services: ServiceRow[];
  customers: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  locationId: string;
  currency: string;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [duration, setDuration] = useState(services[0]?.durationMinutes ?? 30);
  const [price, setPrice] = useState(services[0]?.price ?? 0);
  const [useExistingCustomer, setUseExistingCustomer] = useState(true);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createAppointmentAction, undefined);
  const [, startTransition] = useTransition();

  const isToday = day === new Date().toISOString().slice(0, 10);

  function handleServiceChange(id: string) {
    setServiceId(id);
    const service = services.find((s) => s.id === id);
    if (service) {
      setDuration(service.durationMinutes);
      setPrice(service.price);
    }
  }

  function handleStatus(id: string, status: AppointmentStatus) {
    startTransition(async () => {
      await updateAppointmentStatusAction(id, status);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer ce rendez-vous ?")) return;
    startTransition(async () => {
      await deleteAppointmentAction(id);
      router.refresh();
    });
  }

  const defaultDateTime = useMemo(() => `${day}T09:00`, [day]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/rendez-vous?date=${shiftDay(day, -1)}`} className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <p className="min-w-[180px] text-center text-sm font-medium text-zinc-700">
            {formatLongDate(new Date(`${day}T00:00:00`))} {isToday && <span className="text-zindo-green-600">(aujourd&apos;hui)</span>}
          </p>
          <Link href={`/rendez-vous?date=${shiftDay(day, 1)}`} className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100">
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <Button size="sm" disabled={services.length === 0} onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Nouveau rendez-vous
        </Button>
      </div>

      {services.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-200 p-4 text-center text-sm text-zinc-400">
          Ajoutez d&apos;abord une prestation depuis <Link href="/rendez-vous/services" className="underline">Services & prestations</Link> pour pouvoir créer un rendez-vous.
        </p>
      )}

      {appointments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400">Aucun rendez-vous ce jour-là.</p>
      ) : (
        <Card className="divide-y divide-zinc-100">
          {appointments.map((a) => (
            <CardBody key={a.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-zinc-900">
                  {formatTime(new Date(a.scheduledAt))} · {a.service?.name ?? "Prestation supprimée"}
                </p>
                <p className="text-xs text-zinc-500">
                  {a.customer?.name ?? a.customerName ?? "Client de passage"} {a.customerPhone && <>· {a.customerPhone}</>}
                  {a.staff && <> · {a.staff.firstName} {a.staff.lastName}</>}
                </p>
                <p className="text-xs text-zinc-400">
                  {a.durationMinutes} min · {formatMoney(a.price, currency)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={STATUS_TONE[a.status]}>{APPOINTMENT_STATUS_LABELS[a.status]}</Badge>
                {a.status === "CONFIRME" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleStatus(a.id, "TERMINE")}>
                      Terminé
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleStatus(a.id, "ABSENT")}>
                      Absent
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleStatus(a.id, "ANNULE")}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                <button type="button" onClick={() => handleDelete(a.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50" aria-label="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </CardBody>
          ))}
        </Card>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau rendez-vous">
        <form
          action={(fd) => {
            formAction(fd);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="locationId" value={locationId} />

          <Field label="Prestation" htmlFor="serviceId">
            <Select id="serviceId" name="serviceId" value={serviceId} onChange={(e) => handleServiceChange(e.target.value)} required>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex gap-2">
            <button type="button" onClick={() => setUseExistingCustomer(true)} className={`text-xs font-medium ${useExistingCustomer ? "text-zindo-green-700 underline" : "text-zinc-400"}`}>
              Client existant
            </button>
            <span className="text-zinc-300">·</span>
            <button type="button" onClick={() => setUseExistingCustomer(false)} className={`text-xs font-medium ${!useExistingCustomer ? "text-zindo-green-700 underline" : "text-zinc-400"}`}>
              Client de passage
            </button>
          </div>

          {useExistingCustomer ? (
            <Field label="Client" htmlFor="customerId">
              <Select id="customerId" name="customerId" defaultValue="">
                <option value="">Choisir un client</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom" htmlFor="customerName">
                <Input id="customerName" name="customerName" />
              </Field>
              <Field label="Téléphone" htmlFor="customerPhone">
                <Input id="customerPhone" name="customerPhone" />
              </Field>
            </div>
          )}

          <Field label="Personnel (facultatif)" htmlFor="staffId">
            <Select id="staffId" name="staffId" defaultValue="">
              <option value="">Non assigné</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Date et heure" htmlFor="scheduledAt">
            <Input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={defaultDateTime} required />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Durée (minutes)" htmlFor="durationMinutes">
              <Input id="durationMinutes" name="durationMinutes" type="number" min={5} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 5)} />
            </Field>
            <Field label="Prix" htmlFor="price">
              <Input id="price" name="price" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
            </Field>
          </div>

          <Field label="Note (facultatif)" htmlFor="note">
            <Textarea id="note" name="note" rows={2} />
          </Field>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer le rendez-vous"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

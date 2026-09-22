"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { formatMoney, formatTime } from "@/lib/format";
import { createTableAction, deleteTableAction, openTableOrderAction, type TableRow, type ActionState } from "@/lib/actions/tables";

export function TablesBoard({
  locationId,
  tables,
  customers,
  currency,
}: {
  locationId: string;
  tables: TableRow[];
  customers: { id: string; name: string }[];
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [openingTable, setOpeningTable] = useState<TableRow | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [createState, createAction, createPending] = useActionState<ActionState, FormData>(createTableAction, undefined);

  function handleOpen() {
    if (!openingTable) return;
    const formData = new FormData();
    if (customerId) formData.set("customerId", customerId);
    startTransition(async () => {
      const result = await openTableOrderAction(openingTable.id, formData);
      if (result?.error) {
        alert(result.error);
        return;
      }
      router.push(`/tables/${openingTable.id}`);
    });
  }

  function handleDelete(tableId: string) {
    if (!confirm("Supprimer cette table ?")) return;
    startTransition(async () => {
      const result = await deleteTableAction(tableId);
      if (result?.error) alert(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setAddFormOpen((v) => !v)}>
          {addFormOpen ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {addFormOpen ? "Annuler" : "Ajouter une table"}
        </Button>
      </div>

      {addFormOpen && (
        <form
          action={(fd) => {
            createAction(fd);
            setAddFormOpen(false);
          }}
          className="flex items-end gap-3 rounded-xl border border-zinc-200 p-3"
        >
          <input type="hidden" name="locationId" value={locationId} />
          <Field label="Nom de la table" htmlFor="name" hint='Ex. "Table 1", "Terrasse 3", "Comptoir"'>
            <Input id="name" name="name" required autoFocus />
          </Field>
          <Button type="submit" disabled={createPending}>
            {createPending ? "..." : "Ajouter"}
          </Button>
        </form>
      )}
      {createState?.error && <p className="text-sm text-red-600">{createState.error}</p>}

      {tables.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400">
          Aucune table enregistrée pour cette boutique — ajoutez-en une pour commencer.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tables.map((t) => (
            <div
              key={t.id}
              className={`relative flex flex-col gap-1 rounded-2xl border p-4 ${
                t.openOrder ? "border-amber-300 bg-amber-50" : "border-zinc-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-zinc-900">{t.name}</p>
                <Badge tone={t.openOrder ? "amber" : "emerald"}>{t.openOrder ? "Occupée" : "Libre"}</Badge>
              </div>

              {t.openOrder ? (
                <>
                  <p className="text-xs text-zinc-500">Depuis {formatTime(new Date(t.openOrder.openedAt))}</p>
                  <p className="text-lg font-bold text-zinc-900">{formatMoney(t.openOrder.total, currency)}</p>
                  <Link href={`/tables/${t.id}`} className="mt-1">
                    <Button size="sm" className="w-full">
                      Voir le compte
                    </Button>
                  </Link>
                </>
              ) : (
                <div className="mt-1 flex items-center gap-1.5">
                  <Button size="sm" className="flex-1" onClick={() => setOpeningTable(t)}>
                    Ouvrir
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    disabled={pending}
                    className="rounded-lg p-2 text-red-400 hover:bg-red-50"
                    aria-label="Supprimer la table"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!openingTable} onClose={() => setOpeningTable(null)} title={`Ouvrir ${openingTable?.name ?? ""}`}>
        <div className="space-y-4">
          <Field label="Client (facultatif)" htmlFor="customerId">
            <Select id="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Sans client</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpeningTable(null)}>
              Annuler
            </Button>
            <Button onClick={handleOpen} disabled={pending}>
              {pending ? "Ouverture..." : "Ouvrir le compte"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Search, Trash2, ShieldCheck, ShieldX } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { registerWarrantyAction, searchWarrantyAction, deleteWarrantyAction, type ActionState, type WarrantyRecord } from "@/lib/actions/warranty";

const DURATION_OPTIONS = [3, 6, 12, 18, 24, 36];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function warrantyState(expiresAt: string): { active: boolean; daysLeft: number } {
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return { active: days >= 0, daysLeft: days };
}

export function WarrantyManager({ products, customers }: { products: { id: string; name: string }[]; customers: { id: string; name: string }[] }) {
  const [tab, setTab] = useState<"register" | "search">("register");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(registerWarrantyAction, undefined);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WarrantyRecord[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (tab !== "search") return;
    const timeout = setTimeout(() => {
      searchWarrantyAction(query).then((r) => setResults(r));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, tab]);

  function handleDelete(id: string) {
    if (!confirm("Supprimer cet enregistrement de garantie ?")) return;
    startTransition(async () => {
      await deleteWarrantyAction(id);
      setResults((r) => r.filter((rec) => rec.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("register")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${tab === "register" ? "bg-zindo-ink-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"}`}
        >
          Enregistrer une garantie
        </button>
        <button
          type="button"
          onClick={() => setTab("search")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${tab === "search" ? "bg-zindo-ink-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"}`}
        >
          Rechercher un numéro de série
        </button>
      </div>

      {tab === "register" ? (
        <Card>
          <CardBody>
            <form action={formAction} className="space-y-4">
              <Field label="Produit" htmlFor="productId">
                <Select id="productId" name="productId" defaultValue="" required>
                  <option value="" disabled>
                    Choisir un produit
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Numéro de série / IMEI" htmlFor="serialNumber">
                <Input id="serialNumber" name="serialNumber" required autoFocus />
              </Field>

              <Field label="Client (facultatif)" htmlFor="customerId">
                <Select id="customerId" name="customerId" defaultValue="">
                  <option value="">Sans client</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date de vente" htmlFor="soldAt">
                  <Input id="soldAt" name="soldAt" type="date" defaultValue={todayIso()} required />
                </Field>
                <Field label="Durée de garantie" htmlFor="warrantyMonths">
                  <Select id="warrantyMonths" name="warrantyMonths" defaultValue="12">
                    {DURATION_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} mois
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field label="Note (facultatif)" htmlFor="note">
                <Textarea id="note" name="note" rows={2} />
              </Field>

              {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
              {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}

              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Enregistrement..." : "Enregistrer la garantie"}
              </Button>
            </form>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Numéro de série / IMEI..." className="pl-9" autoFocus />
          </div>

          {results.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
              {query ? "Aucun résultat pour cette recherche." : "Tapez un numéro de série pour le retrouver."}
            </p>
          ) : (
            <ul className="space-y-2">
              {results.map((r) => {
                const { active, daysLeft } = warrantyState(r.warrantyExpiresAt);
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-zinc-900">{r.serialNumber}</p>
                      <p className="text-xs text-zinc-500">
                        {r.product?.name ?? "Produit supprimé"} {r.customer && <>· {r.customer.name}</>}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Vendu le {formatDate(new Date(r.soldAt))} · Garantie {r.warrantyMonths} mois · Expire le {formatDate(new Date(r.warrantyExpiresAt))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={active ? "emerald" : "red"}>
                        {active ? <ShieldCheck className="h-3 w-3" /> : <ShieldX className="h-3 w-3" />}
                        {active ? `Sous garantie (${daysLeft} j.)` : "Garantie expirée"}
                      </Badge>
                      <button type="button" onClick={() => handleDelete(r.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50" aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

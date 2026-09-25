"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ProductPicker } from "@/components/products/ProductPicker";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { createPurchaseOrderAction, getUnitsPerCartonAction } from "@/lib/actions/purchase-orders";

type Line = { productId: string; name: string; reference: string; unit: string; unitsPerCarton: number | null; quantity: number };

export function PurchaseOrderForm({
  suppliers,
  locations,
  defaultLocationId,
}: {
  suppliers: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  defaultLocationId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [responseBy, setResponseBy] = useState("");
  const [note, setNote] = useState("");

  async function addProduct(p: { id: string; name: string; reference: string; unit: string }) {
    if (lines.some((l) => l.productId === p.id)) return;
    const unitsPerCarton = await getUnitsPerCartonAction(p.id);
    const carton = unitsPerCarton && unitsPerCarton > 1 ? unitsPerCarton : null;
    setLines((prev) => [
      ...prev,
      { productId: p.id, name: p.name, reference: p.reference, unit: p.unit, unitsPerCarton: carton, quantity: carton ?? 1 },
    ]);
  }

  function toggleSupplier(id: string) {
    setSupplierIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createPurchaseOrderAction({
        supplierIds,
        locationId,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        responseBy: responseBy || null,
        note: note || null,
      });
      if (!res.success) return setError(res.error);
      router.push(res.orderIds.length === 1 ? `/achats/commandes/${res.orderIds[0]}` : "/achats/commandes");
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <h2 className="font-semibold text-zinc-900 dark:text-slate-100">Produits demandés</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <ProductPicker onSelect={addProduct} locationId={locationId} placeholder="Ajouter un produit..." />
          {lines.length === 0 ? (
            <p className="text-sm text-zinc-500">Aucun produit pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-slate-800">
              {lines.map((l, i) => (
                <li key={l.productId} className="flex flex-wrap items-center gap-3 py-2">
                  <div className="min-w-[160px] flex-1">
                    <p className="font-medium text-zinc-900 dark:text-slate-100">{l.name}</p>
                    <p className="text-xs text-zinc-500">Réf. {l.reference}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">{l.unitsPerCarton ? `Cartons (×${l.unitsPerCarton})` : `Quantité (${l.unit})`}</p>
                    <Input
                      type="number"
                      min={1}
                      className="w-24"
                      value={l.unitsPerCarton ? Math.ceil(l.quantity / l.unitsPerCarton) : l.quantity}
                      onChange={(e) => {
                        const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
                        setLines((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, quantity: x.unitsPerCarton ? n * x.unitsPerCarton : n } : x))
                        );
                      }}
                    />
                    {l.unitsPerCarton && <p className="text-xs text-zinc-500">= {l.quantity} {l.unit}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))}
                    className="text-zinc-400 hover:text-red-600"
                    aria-label={`Retirer ${l.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900 dark:text-slate-100">Fournisseur(s)</h2>
            <p className="text-xs text-zinc-500">Cochez-en plusieurs pour comparer leurs prix.</p>
          </CardHeader>
          <CardBody className="max-h-64 space-y-1 overflow-y-auto">
            {suppliers.length === 0 && <p className="text-sm text-zinc-500">Ajoutez d&apos;abord un fournisseur.</p>}
            {suppliers.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  checked={supplierIds.includes(s.id)}
                  onChange={() => toggleSupplier(s.id)}
                />
                {s.name}
              </label>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-3">
            <Field label="Livrer à" htmlFor="po-location">
              <Select id="po-location" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Réponse souhaitée avant le" htmlFor="po-response">
              <Input id="po-response" type="date" value={responseBy} onChange={(e) => setResponseBy(e.target.value)} />
            </Field>
            <Field label="Remarque pour le fournisseur" htmlFor="po-note">
              <Textarea id="po-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" onClick={submit} disabled={pending || lines.length === 0 || supplierIds.length === 0}>
              {pending
                ? "Création..."
                : supplierIds.length > 1
                  ? `Créer ${supplierIds.length} demandes de prix`
                  : "Créer la demande de prix"}
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

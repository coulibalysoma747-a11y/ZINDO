"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";
import { createInventoryAction } from "@/lib/actions/inventory";

type Product = {
  id: string;
  name: string;
  reference: string;
  unit: string;
  stocks: { locationId: string; quantity: number }[];
};

export function InventoryForm({
  products,
  locations,
  defaultLocationId,
}: {
  products: Product[];
  locations: { id: string; name: string }[];
  defaultLocationId?: string;
}) {
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [realQty, setRealQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const withTheoreticalQty = useMemo(
    () =>
      products.map((p) => ({
        ...p,
        theoreticalQty: p.stocks.find((s) => s.locationId === locationId)?.quantity ?? 0,
      })),
    [products, locationId]
  );

  const filtered = withTheoreticalQty.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.reference.toLowerCase().includes(search.toLowerCase())
  );

  function handleSubmit() {
    setError(null);
    if (!locationId) return setError("Sélectionnez une boutique");

    const items = Object.entries(realQty)
      .filter(([, qty]) => qty !== undefined && !Number.isNaN(qty))
      .map(([productId, qty]) => ({ productId, realQty: qty }));

    if (items.length === 0) {
      setError("Saisissez la quantité réelle d'au moins un produit");
      return;
    }

    startTransition(async () => {
      const result = await createInventoryAction({ locationId, items, note: note || undefined });
      if (!result.success) return setError(result.error);
      router.push(`/inventaire/${result.inventoryId}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={locationId}
          onChange={(e) => {
            setLocationId(e.target.value);
            setRealQty({});
          }}
          className="sm:w-64"
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Filtrer les produits..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2 font-medium">Produit</th>
              <th className="px-4 py-2 text-right font-medium">Stock théorique</th>
              <th className="px-4 py-2 text-right font-medium">Stock réel</th>
              <th className="px-4 py-2 text-right font-medium">Écart</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((p) => {
              const real = realQty[p.id];
              const diff = real === undefined ? null : real - p.theoreticalQty;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2">
                    <p className="font-medium text-zinc-900">{p.name}</p>
                    <p className="text-xs text-zinc-400">{p.reference}</p>
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-700">
                    {p.theoreticalQty} {p.unit}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      value={real ?? ""}
                      placeholder={String(p.theoreticalQty)}
                      onChange={(e) =>
                        setRealQty((prev) => ({
                          ...prev,
                          [p.id]: e.target.value === "" ? (undefined as unknown as number) : Number(e.target.value),
                        }))
                      }
                      className="h-8 w-24 rounded border border-zinc-200 text-right text-sm"
                    />
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-medium ${
                      diff === null ? "text-zinc-300" : diff === 0 ? "text-zinc-500" : diff > 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {diff === null ? "—" : diff > 0 ? `+${diff}` : diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <Field label="Note (facultatif)" htmlFor="note">
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button disabled={pending} onClick={handleSubmit}>
            {pending ? "Enregistrement..." : "Enregistrer l'inventaire"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { bulkFillStockAction } from "@/lib/actions/stock";

type Product = { id: string; name: string; reference: string; unit: string; currentQuantity: number };

export function BulkStockFillForm({ products, locationId }: { products: Product[]; locationId: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"add" | "set">("add");
  const [groupQty, setGroupQty] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q));
  }, [products, search]);

  const checkedCount = Object.values(checked).filter(Boolean).length;

  function toggleAll(value: boolean) {
    const next: Record<string, boolean> = {};
    for (const p of filtered) next[p.id] = value;
    setChecked((c) => ({ ...c, ...next }));
  }

  function applyGroupQty() {
    if (!groupQty) return;
    const next: Record<string, string> = {};
    for (const p of filtered) {
      if (checked[p.id]) next[p.id] = groupQty;
    }
    setValues((v) => ({ ...v, ...next }));
  }

  function submit() {
    const entries = products
      .filter((p) => checked[p.id])
      .map((p) => ({ productId: p.id, quantity: Number(values[p.id] ?? groupQty ?? 0) }))
      .filter((e) => Number.isFinite(e.quantity) && e.quantity >= 0);
    if (entries.length === 0) {
      setMessage("Sélectionnez au moins un produit avec une quantité");
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await bulkFillStockAction(locationId, mode, entries);
      setMessage(result.success ?? result.error ?? null);
      if (result.success) {
        setChecked({});
        setValues({});
        setGroupQty("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-zinc-200 p-1">
              <button
                type="button"
                onClick={() => setMode("add")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === "add" ? "bg-zindo-green-500 text-white" : "text-zinc-600"}`}
              >
                Ajouter
              </button>
              <button
                type="button"
                onClick={() => setMode("set")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === "set" ? "bg-zindo-green-500 text-white" : "text-zinc-600"}`}
              >
                Mettre le stock à
              </button>
            </div>
            <Input
              value={groupQty}
              onChange={(e) => setGroupQty(e.target.value)}
              type="number"
              min={0}
              placeholder="Quantité groupée"
              className="w-40"
            />
            <Button type="button" variant="outline" size="sm" onClick={applyGroupQty} disabled={checkedCount === 0}>
              Appliquer à la sélection ({checkedCount})
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            {mode === "add"
              ? "« Ajouter » : la quantité s'ajoute au stock déjà affiché (une livraison qui s'ajoute au rayon)."
              : "« Mettre le stock à » : la quantité comptée remplace le stock affiché."}
          </p>
        </CardBody>
      </Card>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un produit..." className="pl-9" />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => toggleAll(true)}>
          Tout cocher
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => toggleAll(false)}>
          Tout décocher
        </Button>
      </div>

      <Card className="max-h-[480px] overflow-y-auto divide-y divide-zinc-100">
        {filtered.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3">
            <input
              type="checkbox"
              checked={!!checked[p.id]}
              onChange={(e) => setChecked((c) => ({ ...c, [p.id]: e.target.checked }))}
              className="h-4 w-4 rounded accent-zindo-green-500"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900">{p.name}</p>
              <p className="text-xs text-zinc-400">
                Réf. {p.reference} · Stock actuel : {p.currentQuantity} {p.unit}
              </p>
            </div>
            <Input
              type="number"
              min={0}
              value={values[p.id] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value }))}
              placeholder={groupQty || "0"}
              className="w-24"
            />
          </div>
        ))}
      </Card>

      {message && <p className="text-sm text-zinc-700">{message}</p>}
      <Button type="button" disabled={pending || checkedCount === 0} onClick={submit} className="w-full">
        {pending ? "Enregistrement..." : `Valider (${checkedCount} produit(s))`}
      </Button>
    </div>
  );
}

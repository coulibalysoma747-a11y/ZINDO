"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Trash2 } from "lucide-react";
import { ProductPicker } from "@/components/products/ProductPicker";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { createTransferAction } from "@/lib/actions/transfers";
import { findProductByExactCodeAction } from "@/lib/actions/product-search";

type Product = {
  id: string;
  name: string;
  reference: string;
  unit: string;
  quantity: number;
};

type Line = { product: Product; quantity: number };

export function TransferForm({
  locations,
  defaultFromLocationId,
  initialProduct,
}: {
  locations: { id: string; name: string }[];
  defaultFromLocationId?: string;
  initialProduct: { id: string; reference: string } | null;
}) {
  const [fromLocationId, setFromLocationId] = useState(defaultFromLocationId ?? locations[0]?.id ?? "");
  const [toLocationId, setToLocationId] = useState(
    locations.find((l) => l.id !== (defaultFromLocationId ?? locations[0]?.id))?.id ?? ""
  );
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!initialProduct || !fromLocationId) return;
    findProductByExactCodeAction(initialProduct.reference, fromLocationId).then((product) => {
      if (product) addProduct(product);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addProduct(product: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }

  function handleFromChange(id: string) {
    setFromLocationId(id);
    setLines([]);
    if (id === toLocationId) {
      setToLocationId(locations.find((l) => l.id !== id)?.id ?? "");
    }
  }

  function handleSubmit() {
    setError(null);
    if (!fromLocationId || !toLocationId) return setError("Sélectionnez les deux boutiques");
    if (fromLocationId === toLocationId) return setError("Les boutiques doivent être différentes");
    if (lines.length === 0) return setError("Ajoutez au moins un produit");

    startTransition(async () => {
      const result = await createTransferAction({
        fromLocationId,
        toLocationId,
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        note: note || undefined,
      });
      if (!result.success) return setError(result.error);
      router.push(`/transferts/${result.transferId}`);
    });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Trajet</h2>
        </CardHeader>
        <CardBody className="flex flex-col items-center gap-3 sm:flex-row">
          <Select value={fromLocationId} onChange={(e) => handleFromChange(e.target.value)} className="flex-1">
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          <ArrowRight className="hidden h-5 w-5 shrink-0 text-zinc-400 sm:block" />
          <Select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} className="flex-1">
            <option value="">Sélectionner...</option>
            {locations
              .filter((l) => l.id !== fromLocationId)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </Select>
        </CardBody>
      </Card>

      <ProductPicker onSelect={addProduct} locationId={fromLocationId} placeholder="Ajouter un produit à transférer..." />

      <Card>
        <CardBody className="p-0">
          {lines.length === 0 ? (
            <p className="p-8 text-center text-sm text-zinc-500">Aucun produit ajouté.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[480px]">
                <TableHead>
                  <TableRow interactive={false}>
                    <TableHeaderCell>Produit</TableHeaderCell>
                    <TableHeaderCell align="right">Disponible</TableHeaderCell>
                    <TableHeaderCell align="right">Quantité à transférer</TableHeaderCell>
                    <TableHeaderCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.product.id} interactive={false}>
                      <TableCell className="font-medium text-zinc-900 dark:text-slate-100">{line.product.name}</TableCell>
                      <TableCell align="right" className="tabular-nums text-zinc-500 dark:text-slate-400">
                        {line.product.quantity} {line.product.unit}
                      </TableCell>
                      <TableCell align="right">
                        <input
                          type="number"
                          min={1}
                          max={line.product.quantity}
                          value={line.quantity}
                          onChange={(e) =>
                            updateQuantity(
                              line.product.id,
                              Math.min(line.product.quantity, Math.max(1, Number(e.target.value) || 1))
                            )
                          }
                          className="h-8 w-24 rounded border border-zinc-200 text-right text-sm dark:border-slate-700 dark:bg-slate-900"
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => removeLine(line.product.id)}
                          className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <Field label="Note (facultatif)" htmlFor="note">
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button disabled={pending} onClick={handleSubmit}>
            {pending ? "Enregistrement..." : "Valider le transfert"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

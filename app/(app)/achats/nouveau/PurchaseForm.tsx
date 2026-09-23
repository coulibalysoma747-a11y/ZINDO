"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, RefreshCw, WifiOff } from "lucide-react";
import { ProductPicker } from "@/components/products/ProductPicker";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { formatMoney } from "@/lib/format";
import { createPurchaseAction } from "@/lib/actions/purchases";
import { queueOfflineWrite, getPendingWrites, type PendingWrite } from "@/lib/offline/db";
import { syncPendingWrites } from "@/lib/offline/sync";

type Product = {
  id: string;
  name: string;
  reference: string;
  purchasePrice: number;
  unit: string;
};

type Line = { product: Product; quantity: number; unitPrice: number };

export function PurchaseForm({
  suppliers,
  locations,
  defaultLocationId,
  currency,
}: {
  suppliers: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  defaultLocationId?: string;
  currency: string;
}) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [lines, setLines] = useState<Line[]>([]);
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const total = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0), [lines]);
  const amountPaid = amountPaidInput === "" ? total : Number(amountPaidInput);

  // Mode hors ligne : même mécanisme que app/(app)/ventes/POS.tsx.
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingCount = useCallback(() => {
    getPendingWrites().then((writes: PendingWrite[]) => setPendingCount(writes.filter((w) => w.kind === "purchase").length));
  }, []);

  const runSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncPendingWrites();
    } finally {
      setSyncing(false);
      refreshPendingCount();
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshPendingCount();
    function handleOnline() {
      setIsOnline(true);
      runSync();
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addProduct(product: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { product, quantity: 1, unitPrice: product.purchasePrice }];
    });
  }

  function updateLine(productId: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }

  function handleSubmit() {
    setError(null);
    if (!supplierId) return setError("Sélectionnez un fournisseur");
    if (!locationId) return setError("Sélectionnez la boutique de destination");
    if (lines.length === 0) return setError("Ajoutez au moins un produit");

    const items = lines.map((l) => ({ productId: l.product.id, quantity: l.quantity, unitPrice: l.unitPrice }));

    if (!isOnline) {
      startTransition(async () => {
        const clientRef = crypto.randomUUID();
        await queueOfflineWrite({
          clientRef,
          kind: "purchase",
          createdAt: new Date().toISOString(),
          input: { supplierId, locationId, items, amountPaid, note: note || undefined, clientRef },
          label: `Achat — ${suppliers.find((s) => s.id === supplierId)?.name ?? "Fournisseur"} (${formatMoney(total, currency)})`,
        });
        refreshPendingCount();
        router.push("/achats");
      });
      return;
    }

    startTransition(async () => {
      const result = await createPurchaseAction({ supplierId, locationId, items, amountPaid, note: note || undefined });
      if (!result.success) return setError(result.error);
      router.push(`/achats/${result.purchaseId}`);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Fournisseur &amp; destination</h2>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Sélectionner un fournisseur...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </CardBody>
        </Card>

        <ProductPicker
          onSelect={addProduct}
          locationId={locationId}
          currency={currency}
          placeholder="Ajouter un produit acheté..."
        />

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
                      <TableHeaderCell>Quantité</TableHeaderCell>
                      <TableHeaderCell align="right">Prix d&apos;achat</TableHeaderCell>
                      <TableHeaderCell align="right">Total</TableHeaderCell>
                      <TableHeaderCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.product.id} interactive={false}>
                        <TableCell className="font-medium text-zinc-900 dark:text-slate-100">{line.product.name}</TableCell>
                        <TableCell>
                          <input
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => updateLine(line.product.id, { quantity: Number(e.target.value) || 1 })}
                            className="h-8 w-20 rounded border border-zinc-200 text-center text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <input
                            type="number"
                            min={0}
                            value={line.unitPrice}
                            onChange={(e) => updateLine(line.product.id, { unitPrice: Number(e.target.value) || 0 })}
                            className="h-8 w-28 rounded border border-zinc-200 text-right text-sm dark:border-slate-700 dark:bg-slate-900"
                          />
                        </TableCell>
                        <TableCell align="right" className="font-medium tabular-nums text-zinc-900 dark:text-slate-100">
                          {formatMoney(line.quantity * line.unitPrice, currency)}
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
      </div>

      <div>
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900">Récapitulatif</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex justify-between text-lg font-bold text-zinc-900">
              <span>Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
            <Field label="Montant payé" htmlFor="amountPaid" hint="Laissez vide pour un paiement total immédiat">
              <Input
                id="amountPaid"
                type="number"
                min={0}
                max={total}
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                placeholder={String(total)}
              />
            </Field>
            {amountPaid < total && (
              <p className="text-sm text-amber-600">
                Dette fournisseur : {formatMoney(total - amountPaid, currency)}
              </p>
            )}
            <Field label="Note (facultatif)" htmlFor="note">
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {(!isOnline || pendingCount > 0) && (
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                  !isOnline
                    ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-300"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-slate-700 dark:bg-slate-800 dark:text-zinc-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  {!isOnline ? <WifiOff className="h-4 w-4 shrink-0" /> : <RefreshCw className="h-4 w-4 shrink-0" />}
                  <span>
                    {!isOnline
                      ? `Hors ligne — l'achat sera enregistré sur cet appareil et synchronisé au retour de la connexion.${
                          pendingCount > 0 ? ` (${pendingCount} en attente)` : ""
                        }`
                      : `${pendingCount} achat(s) en attente de synchronisation.`}
                  </span>
                </div>
                {isOnline && pendingCount > 0 && (
                  <Button size="sm" variant="outline" onClick={runSync} disabled={syncing}>
                    {syncing ? "Synchronisation..." : "Synchroniser"}
                  </Button>
                )}
              </div>
            )}
            <Button className="w-full" size="lg" disabled={pending} onClick={handleSubmit}>
              {pending ? "Enregistrement..." : "Valider l'achat"}
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

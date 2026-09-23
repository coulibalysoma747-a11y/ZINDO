"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, WifiOff } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { createInventoryAction } from "@/lib/actions/inventory";
import { queueOfflineWrite, getPendingWrites, type PendingWrite } from "@/lib/offline/db";
import { syncPendingWrites } from "@/lib/offline/sync";

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

  // Mode hors ligne : même mécanisme que app/(app)/ventes/POS.tsx.
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingCount = useCallback(() => {
    getPendingWrites().then((writes: PendingWrite[]) => setPendingCount(writes.filter((w) => w.kind === "inventory").length));
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

    if (!isOnline) {
      startTransition(async () => {
        const clientRef = crypto.randomUUID();
        await queueOfflineWrite({
          clientRef,
          kind: "inventory",
          createdAt: new Date().toISOString(),
          input: { locationId, items, note: note || undefined, clientRef },
          label: `Inventaire — ${locations.find((l) => l.id === locationId)?.name ?? "Boutique"} (${items.length} produit(s))`,
        });
        refreshPendingCount();
        router.push("/inventaire");
      });
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
        <Table className="min-w-[600px]">
          <TableHead>
            <TableRow interactive={false}>
              <TableHeaderCell>Produit</TableHeaderCell>
              <TableHeaderCell align="right">Stock théorique</TableHeaderCell>
              <TableHeaderCell align="right">Stock réel</TableHeaderCell>
              <TableHeaderCell align="right">Écart</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((p) => {
              const real = realQty[p.id];
              const diff = real === undefined ? null : real - p.theoreticalQty;
              return (
                <TableRow key={p.id} interactive={false}>
                  <TableCell>
                    <p className="font-medium text-zinc-900 dark:text-slate-100">{p.name}</p>
                    <p className="text-xs text-zinc-400">{p.reference}</p>
                  </TableCell>
                  <TableCell align="right" className="tabular-nums text-zinc-700 dark:text-slate-300">
                    {p.theoreticalQty} {p.unit}
                  </TableCell>
                  <TableCell align="right">
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
                      className="h-8 w-24 rounded border border-zinc-200 text-right text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </TableCell>
                  <TableCell
                    align="right"
                    className={`font-medium tabular-nums ${
                      diff === null ? "text-zinc-300" : diff === 0 ? "text-zinc-500" : diff > 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {diff === null ? "—" : diff > 0 ? `+${diff}` : diff}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <CardBody className="space-y-3">
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
                    ? `Hors ligne — l'inventaire sera enregistré sur cet appareil et synchronisé au retour de la connexion.${
                        pendingCount > 0 ? ` (${pendingCount} en attente)` : ""
                      }`
                    : `${pendingCount} inventaire(s) en attente de synchronisation.`}
                </span>
              </div>
              {isOnline && pendingCount > 0 && (
                <Button size="sm" variant="outline" onClick={runSync} disabled={syncing}>
                  {syncing ? "Synchronisation..." : "Synchroniser"}
                </Button>
              )}
            </div>
          )}
          <Button disabled={pending} onClick={handleSubmit}>
            {pending ? "Enregistrement..." : "Enregistrer l'inventaire"}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

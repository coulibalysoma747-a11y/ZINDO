"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, WifiOff } from "lucide-react";
import { ProductPicker } from "@/components/products/ProductPicker";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button, ButtonLink } from "@/components/ui/Button";
import { createStockMovementJsonAction } from "@/lib/actions/stock";
import { queueOfflineWrite, getPendingWrites, type PendingWrite } from "@/lib/offline/db";
import { syncPendingWrites } from "@/lib/offline/sync";

const IN_REASONS = [
  { value: "ACHAT", label: "Achat" },
  { value: "RETOUR_CLIENT", label: "Retour client" },
  { value: "CORRECTION", label: "Correction de stock" },
  { value: "INVENTAIRE", label: "Inventaire" },
  { value: "AUTRE", label: "Autre" },
];

const OUT_REASONS = [
  { value: "PRODUIT_ENDOMMAGE", label: "Produit endommagé" },
  { value: "PERTE", label: "Perte" },
  { value: "RETOUR_FOURNISSEUR", label: "Retour fournisseur" },
  { value: "CORRECTION", label: "Correction de stock" },
  { value: "AUTRE", label: "Autre" },
];

type Product = {
  id: string;
  name: string;
  reference: string;
  quantity: number;
  unit: string;
  salePrice: number;
  purchasePrice: number;
};

export function StockMovementForm({
  direction,
  initialProduct,
  locations,
  defaultLocationId,
  currency,
}: {
  direction: "IN" | "OUT";
  initialProduct: Product | null;
  locations: { id: string; name: string }[];
  defaultLocationId?: string;
  currency: string;
}) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(defaultLocationId ?? locations[0]?.id ?? "");
  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reasons = direction === "IN" ? IN_REASONS : OUT_REASONS;

  // Mode hors ligne : même mécanisme que app/(app)/ventes/POS.tsx — le
  // mouvement est mis en file localement et rejoué à la reconnexion.
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingCount = useCallback(() => {
    getPendingWrites().then((writes: PendingWrite[]) =>
      setPendingCount(writes.filter((w) => w.kind === "stockMovement").length)
    );
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

  function handleSubmit() {
    setError(null);
    if (!product) {
      setError("Sélectionnez un produit");
      return;
    }
    const parsedQuantity = Number(quantity);
    if (!parsedQuantity || parsedQuantity <= 0) {
      setError("Quantité invalide");
      return;
    }
    if (!reason) {
      setError("Sélectionnez un motif");
      return;
    }
    if (direction === "OUT" && !isOnline && parsedQuantity > product.quantity) {
      setError(`Stock insuffisant d'après le dernier chiffre connu (disponible : ${product.quantity})`);
      return;
    }

    const input = { productId: product.id, locationId, quantity: parsedQuantity, reason, note: note || undefined };

    if (!isOnline) {
      startTransition(async () => {
        const clientRef = crypto.randomUUID();
        await queueOfflineWrite({
          clientRef,
          kind: "stockMovement",
          createdAt: new Date().toISOString(),
          input: { ...input, direction, clientRef },
          label: `${direction === "IN" ? "Entrée" : "Sortie"} — ${product.name} (${parsedQuantity} ${product.unit})`,
        });
        refreshPendingCount();
        router.push("/stock");
      });
      return;
    }

    startTransition(async () => {
      const result = await createStockMovementJsonAction(direction, input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/stock");
    });
  }

  return (
    <div className="max-w-xl space-y-4">
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
                ? `Hors ligne — les mouvements sont enregistrés sur cet appareil et se synchroniseront au retour de la connexion.${
                    pendingCount > 0 ? ` (${pendingCount} en attente)` : ""
                  }`
                : `${pendingCount} mouvement(s) en attente de synchronisation.`}
            </span>
          </div>
          {isOnline && pendingCount > 0 && (
            <Button size="sm" variant="outline" onClick={runSync} disabled={syncing}>
              {syncing ? "Synchronisation..." : "Synchroniser maintenant"}
            </Button>
          )}
        </div>
      )}

      <Field label="Boutique" htmlFor="location-select">
        <Select
          id="location-select"
          value={locationId}
          onChange={(e) => {
            setLocationId(e.target.value);
            setProduct(null);
          }}
        >
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <Field label="Produit" htmlFor="product-picker">
          <ProductPicker
            onSelect={setProduct}
            locationId={locationId}
            currency={currency}
            placeholder="Rechercher le produit concerné..."
          />
        </Field>
        {product && (
          <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
            <span className="font-medium text-zinc-900">{product.name}</span> — Stock actuel :{" "}
            {product.quantity} {product.unit}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <Field label="Quantité" htmlFor="quantity">
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
        <Field label="Motif" htmlFor="reason">
          <Select id="reason" name="reason" required value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Sélectionner un motif</option>
            {reasons.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Note (facultatif)" htmlFor="note">
          <Textarea id="note" name="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <ButtonLink href="/stock" variant="outline">
            Annuler
          </ButtonLink>
          <Button type="button" disabled={pending || !product} onClick={handleSubmit}>
            {pending ? "Enregistrement..." : direction === "IN" ? "Enregistrer l'entrée" : "Enregistrer la sortie"}
          </Button>
        </div>
      </div>
    </div>
  );
}

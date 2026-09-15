"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Unplug, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/format";
import {
  connectFasoStockAction,
  reloadFasoStockStoresAction,
  disconnectFasoStockAction,
  saveFasoStockMappingAction,
  runFasoStockSyncAction,
} from "@/lib/actions/faso-stock";
import type { FasoStockStore } from "@/lib/integrations/faso-stock";

type LocationOption = { id: string; name: string };

/**
 * Intégration FasoStock (Paramètres) : connexion par clé API, association de
 * chaque boutique FasoStock à une boutique ZINDO, puis synchronisation
 * manuelle. Sens unique FasoStock → ZINDO — leur API est en lecture seule,
 * voir lib/faso-stock-sync.ts. Une synchronisation automatique tourne aussi
 * en tâche de fond (vercel.json → crons) une fois l'association enregistrée.
 */
export function FasoStockPanel({
  initiallyConnected,
  initialStores,
  locations,
  initialMapping,
  lastSyncAt,
  lastSyncStatus,
  lastSyncError,
}: {
  initiallyConnected: boolean;
  initialStores: FasoStockStore[];
  locations: LocationOption[];
  initialMapping: Record<string, string>;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
}) {
  const [connected, setConnected] = useState(initiallyConnected);
  const [stores, setStores] = useState<FasoStockStore[]>(initialStores);
  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState({ at: lastSyncAt, status: lastSyncStatus, error: lastSyncError });
  const [connecting, startConnecting] = useTransition();
  const [saving, startSaving] = useTransition();
  const [syncing, startSyncing] = useTransition();
  const [disconnecting, startDisconnecting] = useTransition();

  function handleConnect() {
    setError(null);
    setMessage(null);
    if (!apiKeyInput.trim()) {
      setError("Collez votre clé API FasoStock.");
      return;
    }
    startConnecting(async () => {
      const formData = new FormData();
      formData.set("apiKey", apiKeyInput.trim());
      const result = await connectFasoStockAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStores(result.stores);
      setConnected(true);
      setApiKeyInput("");
      setMessage("Connecté à FasoStock. Associez vos boutiques ci-dessous.");
    });
  }

  function handleReload() {
    setError(null);
    setMessage(null);
    startConnecting(async () => {
      const result = await reloadFasoStockStoresAction();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStores(result.stores);
    });
  }

  function handleDisconnect() {
    setError(null);
    setMessage(null);
    startDisconnecting(async () => {
      const result = await disconnectFasoStockAction();
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setConnected(false);
      setStores([]);
      setMapping({});
      setSyncInfo({ at: null, status: null, error: null });
      setMessage("FasoStock déconnecté.");
    });
  }

  function handleSaveMapping() {
    setError(null);
    setMessage(null);
    startSaving(async () => {
      const result = await saveFasoStockMappingAction(mapping);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setMessage("Association enregistrée.");
    });
  }

  function handleSync() {
    setError(null);
    setMessage(null);
    startSyncing(async () => {
      const result = await runFasoStockSyncAction();
      setSyncInfo({
        at: new Date().toISOString(),
        status: result.success ? "OK" : "ERREUR",
        error: result.success ? null : result.error,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage(result.message);
    });
  }

  if (!connected) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-500">
          Connectez votre compte FasoStock pour importer automatiquement vos produits, prix et stock dans ZINDO.
          La clé se crée dans FasoStock → Paramètres → Intégrations API.
        </p>
        <Field label="Clé API FasoStock" htmlFor="fasoStockKey">
          <Input
            id="fasoStockKey"
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="fs_..."
          />
        </Field>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button onClick={handleConnect} disabled={connecting}>
          {connecting ? "Connexion..." : "Connecter"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-zindo-green-600">
          <Check className="h-4 w-4" /> Connecté à FasoStock
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReload} disabled={connecting}>
            <RefreshCw className="h-3.5 w-3.5" /> Recharger les boutiques
          </Button>
          <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
            <Unplug className="h-3.5 w-3.5" /> Déconnecter
          </Button>
        </div>
      </div>

      {stores.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucune boutique trouvée sur votre compte FasoStock.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700">Associer chaque boutique FasoStock à une boutique ZINDO</p>
          {stores.map((store) => (
            <div key={store.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">{store.name}</p>
                <p className="text-xs text-zinc-500">{store.code}{store.address ? ` — ${store.address}` : ""}</p>
              </div>
              <Select
                className="w-full sm:w-56"
                value={mapping[store.id] ?? ""}
                onChange={(e) => setMapping((m) => ({ ...m, [store.id]: e.target.value }))}
              >
                <option value="">Ne pas synchroniser</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </Select>
            </div>
          ))}
          <Button variant="outline" onClick={handleSaveMapping} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer l'association"}
          </Button>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
        <div className="text-xs text-zinc-500">
          {syncInfo.at ? (
            <>
              Dernière synchronisation : {formatDateTime(new Date(syncInfo.at))} —{" "}
              {syncInfo.status === "OK" ? (
                <span className="text-zindo-green-600">réussie</span>
              ) : (
                <span className="text-red-600">échouée ({syncInfo.error})</span>
              )}
              <br />
              La synchronisation automatique tourne aussi en tâche de fond une fois par jour (vers 3h).
            </>
          ) : (
            "Jamais synchronisé — la synchronisation automatique tourne en tâche de fond une fois par jour (vers 3h) une fois l'association enregistrée."
          )}
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? "Synchronisation..." : "Synchroniser maintenant"}
        </Button>
      </div>
    </div>
  );
}

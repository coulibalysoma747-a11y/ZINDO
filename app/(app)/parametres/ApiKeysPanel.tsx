"use client";

import { useEffect, useState, useTransition } from "react";
import { Code2, Trash2, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  listApiKeysAction,
  createApiKeyAction,
  revokeApiKeyAction,
  type ApiKeySummary,
} from "@/lib/actions/api-keys";

function formatDate(iso: string | null): string {
  if (!iso) return "Jamais";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    listApiKeysAction().then(setKeys);
  }, []);

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <Code2 className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Intégrations API</p>
          <p className="mt-1 text-sm text-zinc-500">
            Générez une clé pour lire vos produits, votre stock, vos ventes et vos clients depuis un outil externe
            (lecture seule — <span className="font-mono text-xs">GET /api/v1/produits, /stock, /ventes, /clients</span>).
            Envoyez-la dans l&apos;en-tête <span className="font-mono text-xs">Authorization: Bearer &lt;clé&gt;</span>.
          </p>
        </div>
      </div>

      {newKey && (
        <div className="mt-3 rounded-lg bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            Copiez cette clé maintenant — elle ne sera plus jamais affichée en entier.
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-white p-2">
            <code className="flex-1 overflow-x-auto text-xs">{newKey}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(newKey).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                });
              }}
              className="shrink-0 text-zinc-400 hover:text-zindo-green-600"
            >
              {copied ? <Check className="h-4 w-4 text-zindo-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <Button type="button" size="sm" className="mt-2" onClick={() => setNewKey(null)}>
            J&apos;ai copié ma clé
          </Button>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {keys === null && <p className="text-sm text-zinc-400">Chargement...</p>}
        {keys?.length === 0 && <p className="text-sm text-zinc-400">Aucune clé créée pour l&apos;instant.</p>}
        {keys?.map((k) => (
          <div key={k.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">{k.name}</p>
              <p className="truncate font-mono text-xs text-zinc-400">
                {k.keyPrefix}… · Créée le {formatDate(k.createdAt)} · Dernière utilisation : {formatDate(k.lastUsedAt)}
                {k.revoked && " · Révoquée"}
              </p>
            </div>
            {!k.revoked && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await revokeApiKeyAction(k.id);
                    setKeys((prev) => prev?.map((x) => (x.id === k.id ? { ...x, revoked: true } : x)) ?? null);
                  });
                }}
                className="shrink-0 text-zinc-400 hover:text-red-600"
                aria-label="Révoquer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          id="new-api-key-name"
          placeholder="Nom de la clé (ex. Comptabilité)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          disabled={pending || !name.trim()}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await createApiKeyAction(name);
              if ("error" in result) {
                setError(result.error);
                return;
              }
              setNewKey(result.key);
              setKeys((prev) => [result.summary, ...(prev ?? [])]);
              setName("");
            });
          }}
        >
          Créer une clé
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

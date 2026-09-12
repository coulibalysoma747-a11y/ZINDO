"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import {
  setFeatureFlagGlobalAction,
  setFeatureFlagBusinessAction,
  deleteFeatureFlagAction,
} from "@/lib/actions/feature-flags";

type Business = { id: string; name: string };
type Override = { businessId: string; enabled: boolean };

export function FeatureFlagCard({
  flag,
  businesses,
  overrides,
}: {
  flag: { id: string; key: string; label: string; description: string | null; enabledGlobally: boolean };
  businesses: Business[];
  overrides: Override[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function isBusinessEnabled(businessId: string) {
    if (flag.enabledGlobally) return true;
    return overrides.find((o) => o.businessId === businessId)?.enabled ?? false;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-zinc-900">{flag.label}</p>
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-500">
              {flag.key}
            </span>
          </div>
          {flag.description && <p className="mt-0.5 text-sm text-zinc-500">{flag.description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={flag.enabledGlobally}
              disabled={pending}
              onChange={(e) =>
                startTransition(async () => {
                  await setFeatureFlagGlobalAction(flag.id, e.target.checked);
                  router.refresh();
                })
              }
              className="h-4 w-4 rounded accent-zindo-orange-500"
            />
            Activer pour tous les commerçants
          </label>
          <ConfirmButton
            label={
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            }
            confirmTitle={`Supprimer "${flag.label}"`}
            confirmMessage="Cette fonctionnalité et tous ses réglages par commerce seront supprimés définitivement."
            action={() => deleteFeatureFlagAction(flag.id)}
            onDone={() => router.refresh()}
          />
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Par commerce {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-zinc-100 border-t border-zinc-100">
          {businesses.map((b) => (
            <label
              key={b.id}
              className="flex items-center justify-between px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <span>{b.name}</span>
              <input
                type="checkbox"
                checked={isBusinessEnabled(b.id)}
                disabled={pending || flag.enabledGlobally}
                onChange={(e) =>
                  startTransition(async () => {
                    await setFeatureFlagBusinessAction(flag.id, b.id, e.target.checked);
                    router.refresh();
                  })
                }
                className="h-4 w-4 rounded accent-zindo-orange-500 disabled:opacity-40"
              />
            </label>
          ))}
          {flag.enabledGlobally && (
            <p className="px-4 py-2 text-xs text-zinc-400">
              Déjà activée pour tous les commerçants — désactivez le réglage global pour choisir commerce
              par commerce.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

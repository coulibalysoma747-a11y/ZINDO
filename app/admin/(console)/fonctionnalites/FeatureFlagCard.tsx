"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Trash2, Store, Warehouse } from "lucide-react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { ACTIVITIES } from "@/lib/activities";
import {
  setFeatureFlagGlobalAction,
  setFeatureFlagBusinessAction,
  setFeatureFlagLocationAction,
  clearFeatureFlagLocationAction,
  setFeatureFlagActivityAction,
  deleteFeatureFlagAction,
} from "@/lib/actions/feature-flags";

type Business = { id: string; name: string };
type LocationRow = { id: string; businessId: string; name: string; type: "BOUTIQUE" | "DEPOT" };
type Override = { businessId: string; enabled: boolean };
type LocationOverride = { locationId: string; enabled: boolean };

type ActivityRule = { activityKey: string; enabled: boolean };

export function FeatureFlagCard({
  flag,
  businesses,
  locations,
  overrides,
  locationOverrides,
  activityRules,
}: {
  flag: { id: string; key: string; label: string; description: string | null; enabledGlobally: boolean };
  businesses: Business[];
  locations: LocationRow[];
  overrides: Override[];
  locationOverrides: LocationOverride[];
  activityRules: ActivityRule[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [openBusinessId, setOpenBusinessId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function isActivityEnabled(activityKey: string) {
    return activityRules.find((r) => r.activityKey === activityKey)?.enabled ?? false;
  }

  function handleActivityChange(activityKey: string, checked: boolean) {
    startTransition(async () => {
      await setFeatureFlagActivityAction(flag.id, activityKey, checked);
      router.refresh();
    });
  }

  function isBusinessEnabled(businessId: string) {
    if (flag.enabledGlobally) return true;
    return overrides.find((o) => o.businessId === businessId)?.enabled ?? false;
  }

  function locationOverrideValue(locationId: string): "inherit" | "on" | "off" {
    const o = locationOverrides.find((lo) => lo.locationId === locationId);
    if (!o) return "inherit";
    return o.enabled ? "on" : "off";
  }

  function handleLocationChange(locationId: string, value: "inherit" | "on" | "off") {
    startTransition(async () => {
      if (value === "inherit") {
        await clearFeatureFlagLocationAction(flag.id, locationId);
      } else {
        await setFeatureFlagLocationAction(flag.id, locationId, value === "on");
      }
      router.refresh();
    });
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
              className="h-4 w-4 rounded accent-zindo-green-500"
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
            confirmMessage="Cette fonctionnalité et tous ses réglages par commerce et par boutique seront supprimés définitivement."
            action={() => deleteFeatureFlagAction(flag.id)}
            onDone={() => router.refresh()}
          />
          <button
            type="button"
            onClick={() => setActivityExpanded((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Par activité {activityExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Par commerce {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {activityExpanded && (
        <div className="border-t border-zinc-100 px-4 py-3">
          <p className="mb-2 text-xs text-zinc-500">
            Règle persistante : couvre aussi les commerces qui choisiront cette activité plus tard, sans avoir à
            revenir ici. Une dérogation cochée pour un commerce précis (« Par commerce » ci-dessous) reste
            prioritaire sur ce réglage.
          </p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {ACTIVITIES.map((a) => (
              <label key={a.key} className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={isActivityEnabled(a.key)}
                  disabled={pending || flag.enabledGlobally}
                  onChange={(e) => handleActivityChange(a.key, e.target.checked)}
                  className="h-4 w-4 rounded accent-zindo-green-500 disabled:opacity-40"
                />
                {a.emoji} {a.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {expanded && (
        <div className="divide-y divide-zinc-100 border-t border-zinc-100">
          {businesses.map((b) => {
            const businessLocations = locations.filter((l) => l.businessId === b.id);
            const hasMultipleLocations = businessLocations.length > 1;
            return (
              <div key={b.id}>
                <div className="flex items-center justify-between px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                  <label className="flex flex-1 items-center gap-2">
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
                      className="h-4 w-4 rounded accent-zindo-green-500 disabled:opacity-40"
                    />
                    {b.name}
                  </label>
                  {hasMultipleLocations && (
                    <button
                      type="button"
                      onClick={() => setOpenBusinessId((v) => (v === b.id ? null : b.id))}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zindo-green-700 hover:bg-zindo-green-50"
                    >
                      Par boutique ({businessLocations.length})
                      {openBusinessId === b.id ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {hasMultipleLocations && openBusinessId === b.id && (
                  <div className="space-y-1.5 bg-zinc-50 px-4 py-2 pl-9">
                    {businessLocations.map((l) => (
                      <div key={l.id} className="flex items-center justify-between gap-3 text-xs text-zinc-600">
                        <span className="flex items-center gap-1.5">
                          {l.type === "DEPOT" ? (
                            <Warehouse className="h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <Store className="h-3.5 w-3.5 shrink-0" />
                          )}
                          {l.name}
                        </span>
                        <select
                          value={locationOverrideValue(l.id)}
                          disabled={pending}
                          onChange={(e) => handleLocationChange(l.id, e.target.value as "inherit" | "on" | "off")}
                          className="rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 disabled:opacity-40"
                        >
                          <option value="inherit">Hérite du commerce</option>
                          <option value="on">Activée</option>
                          <option value="off">Désactivée</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {flag.enabledGlobally && (
            <p className="px-4 py-2 text-xs text-zinc-400">
              Déjà activée pour tous les commerçants — désactivez le réglage global pour choisir commerce
              par commerce (le réglage par boutique reste, lui, toujours prioritaire).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

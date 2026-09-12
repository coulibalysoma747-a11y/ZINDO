"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Check, ArrowLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ACTIVITIES, ACTIVITY_CATEGORIES, findActivity } from "@/lib/activities";
import { setBusinessActivityAction, type ActionState } from "@/lib/actions/activity";

export function ActivityPicker({
  mode,
  currentActivityKey,
}: {
  mode: "onboarding" | "change";
  currentActivityKey: string | null;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(currentActivityKey);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    setBusinessActivityAction,
    undefined
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ACTIVITIES.filter((a) => {
      const matchesCategory = category === "all" || a.category === category;
      const matchesSearch =
        !q || a.label.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  const currentActivity = findActivity(currentActivityKey);
  const selectedActivity = findActivity(selectedKey);
  const isActualChange = mode === "change" && selectedKey !== currentActivityKey;

  function handleContinue() {
    if (!selectedKey) return;
    if (isActualChange) {
      setConfirmOpen(true);
      return;
    }
    formRef.current?.requestSubmit();
  }

  return (
    <div className="w-full">
      {mode === "change" && (
        <Link
          href="/parametres"
          className="mb-4 flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux paramètres
        </Link>
      )}

      {mode === "change" && currentActivity && (
        <p className="mb-4 text-center text-sm text-zinc-500">
          Activité actuelle :{" "}
          <span className="font-semibold text-zinc-700">
            {currentActivity.emoji} {currentActivity.label}
          </span>
        </p>
      )}

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher votre activité..."
          className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 shadow-sm outline-none placeholder:text-zinc-400 focus:border-zindo-orange-400 focus:ring-2 focus:ring-zindo-orange-100"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            category === "all" ? "bg-zindo-navy-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          Toutes
        </button>
        {ACTIVITY_CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              category === c.key ? "bg-zindo-navy-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">Aucune activité ne correspond à votre recherche.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => {
            const active = selectedKey === a.key;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => setSelectedKey(a.key)}
                className={`relative flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-zindo-orange-400 bg-white shadow-md ring-2 ring-zindo-orange-200"
                    : "border-zinc-200 bg-white/70 hover:border-zindo-orange-200 hover:bg-white"
                }`}
              >
                {active && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-zindo-orange-500 text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
                <span className="text-2xl">{a.emoji}</span>
                <span className="font-semibold text-zindo-navy-900">{a.label}</span>
                <span className="text-xs text-zinc-500">{a.description}</span>
              </button>
            );
          })}
        </div>
      )}

      <form ref={formRef} action={formAction} className="mt-8 flex flex-col items-center gap-2">
        <input type="hidden" name="activityKey" value={selectedKey ?? ""} />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Button
          type="button"
          size="lg"
          className="w-full max-w-xs"
          disabled={!selectedKey || pending}
          onClick={handleContinue}
        >
          {pending ? "Enregistrement..." : "Continuer"}
        </Button>
      </form>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Changer d'activité ?">
        <p className="text-sm text-zinc-600">
          ZINDO va adapter votre espace de travail à l&apos;activité{" "}
          <span className="font-semibold text-zinc-900">
            {selectedActivity?.emoji} {selectedActivity?.label}
          </span>
          . Voulez-vous continuer ?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              setConfirmOpen(false);
              formRef.current?.requestSubmit();
            }}
          >
            Confirmer
          </Button>
        </div>
      </Modal>
    </div>
  );
}

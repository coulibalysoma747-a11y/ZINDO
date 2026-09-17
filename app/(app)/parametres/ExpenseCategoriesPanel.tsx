"use client";

import { useState, useTransition } from "react";
import { Receipt, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateBusinessSettingsAction } from "@/lib/actions/business-settings";

export function ExpenseCategoriesPanel({ categories: initial }: { categories: string[] }) {
  const [categories, setCategories] = useState(initial);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(next: string[]) {
    setCategories(next);
    setError(null);
    startTransition(async () => {
      const result = await updateBusinessSettingsAction({ expenseCategories: next });
      if (result.error) setError(result.error);
    });
  }

  function add() {
    const value = draft.trim();
    if (!value || categories.includes(value)) return;
    save([...categories, value]);
    setDraft("");
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-start gap-2.5">
        <Receipt className="mt-0.5 h-5 w-5 shrink-0 text-zindo-green-600" />
        <div>
          <p className="font-bold text-zinc-900">Personnaliser mes dépenses</p>
          <p className="mt-1 text-sm text-zinc-500">
            Vos propres catégories de dépenses (loyer, carburant, salaires...) proposées à la saisie. Vos dépenses
            déjà enregistrées ne bougent pas si vous en retirez une.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {categories.map((c) => (
          <span key={c} className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700">
            {c}
            <button
              type="button"
              disabled={pending}
              onClick={() => save(categories.filter((x) => x !== c))}
              className="text-zinc-400 hover:text-red-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Nouvelle catégorie"
          className="flex-1"
        />
        <Button type="button" variant="outline" disabled={pending} onClick={add}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

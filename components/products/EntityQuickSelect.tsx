"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Select, Input } from "@/components/ui/Input";

type Option = { id: string; name: string };

/**
 * Sélecteur + création à la volée, réutilisé pour Catégorie (soumet l'id,
 * products.category_id est une clé étrangère) et Marque (soumet le nom,
 * products.brand reste un simple champ texte — voir supabase/schema.sql).
 */
export function EntityQuickSelect({
  id,
  name,
  options,
  defaultValue,
  onCreate,
  submitValue = "id",
  emptyLabel = "Aucune",
  newPlaceholder = "Nouvelle...",
  required = false,
}: {
  id: string;
  name: string;
  options: Option[];
  defaultValue?: string | null;
  onCreate: (name: string) => Promise<{ id: string } | { error: string }>;
  submitValue?: "id" | "name";
  emptyLabel?: string;
  newPlaceholder?: string;
  required?: boolean;
}) {
  const [items, setItems] = useState(options);
  const [selected, setSelected] = useState(defaultValue ?? "");
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await onCreate(trimmed);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setItems((cur) => [...cur, { id: result.id, name: trimmed }].sort((a, b) => a.name.localeCompare(b.name)));
      setSelected(submitValue === "name" ? trimmed : result.id);
      setNewName("");
    });
  }

  return (
    <div className="space-y-1.5">
      <Select id={id} name={name} value={selected} onChange={(e) => setSelected(e.target.value)} required={required}>
        <option value="" disabled={required}>
          {emptyLabel}
        </option>
        {items.map((o) => (
          <option key={o.id} value={submitValue === "name" ? o.name : o.id}>
            {o.name}
          </option>
        ))}
      </Select>
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={newPlaceholder}
          className="flex-1"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={pending || !newName.trim()}
          className="rounded-lg border border-zinc-300 px-3 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          aria-label="Créer"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

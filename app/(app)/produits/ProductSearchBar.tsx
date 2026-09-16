"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { useTransition } from "react";

export function ProductSearchBar({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Rechercher par nom, référence ou code-barres..."
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => updateParam("q", e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        defaultValue={searchParams.get("categorie") ?? ""}
        onChange={(e) => updateParam("categorie", e.target.value)}
        className="sm:w-56"
      >
        <option value="">Toutes les catégories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Select
        defaultValue={searchParams.get("filtre") ?? ""}
        onChange={(e) => updateParam("filtre", e.target.value)}
        className="sm:w-48"
      >
        <option value="">Tous les statuts</option>
        <option value="stock-faible">Stock faible</option>
        <option value="rupture">En rupture</option>
      </Select>
    </div>
  );
}

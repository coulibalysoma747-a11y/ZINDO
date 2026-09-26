"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, Field } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { useTransition } from "react";

export function ProductSearchBar({
  categories,
  brands,
  showPackagingFilter = false,
}: {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  /** N'affiche le filtre "Conditionnement" que si la fonctionnalité est activée pour ce commerce. */
  showPackagingFilter?: boolean;
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
    <div className="space-y-3">
      <SearchInput
        placeholder="Rechercher par nom, référence, code-barres ou autre nom…"
        aria-label="Rechercher un produit"
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => updateParam("q", e.target.value)}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Catégorie" htmlFor="categorie-filter">
          <Select
            id="categorie-filter"
            defaultValue={searchParams.get("categorie") ?? ""}
            onChange={(e) => updateParam("categorie", e.target.value)}
          >
            <option value="">Toutes</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Marque" htmlFor="marque-filter">
          <Select
            id="marque-filter"
            defaultValue={searchParams.get("marque") ?? ""}
            onChange={(e) => updateParam("marque", e.target.value)}
          >
            <option value="">Toutes</option>
            {brands.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        {showPackagingFilter && (
          <Field label="Conditionnement" htmlFor="conditionnement-filter">
            <Select
              id="conditionnement-filter"
              defaultValue={searchParams.get("conditionnement") ?? ""}
              onChange={(e) => updateParam("conditionnement", e.target.value)}
            >
              <option value="">Tous</option>
              <option value="avec">Avec conditionnement</option>
              <option value="sans">Sans conditionnement</option>
            </Select>
          </Field>
        )}
      </div>
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

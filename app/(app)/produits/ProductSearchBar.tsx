"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, Field } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { useState, useTransition } from "react";
import { SlidersHorizontal } from "lucide-react";

export function ProductSearchBar({
  categories,
  brands,
  showPackagingFilter = false,
  compactOnMobile = false,
  pro = false,
}: {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  /** N'affiche le filtre "Conditionnement" que si la fonctionnalité est activée pour ce commerce. */
  showPackagingFilter?: boolean;
  /** Téléphone : filtres repliés derrière un bouton « Filtres » (flag produits_mobile). */
  compactOnMobile?: boolean;
  /** Interface pro : recherche et filtres sur une seule ligne. */
  pro?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const activeFilters = ["categorie", "marque", "conditionnement", "filtre"].filter((k) => searchParams.get(k)).length;
  const [filtersOpen, setFiltersOpen] = useState(activeFilters > 0);
  const hideOnMobile = compactOnMobile && !filtersOpen ? "hidden sm:grid" : "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  if (pro) {
    const selectClass = "!h-[42px] !w-auto min-w-[170px] !rounded-xl";
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="min-w-[240px] flex-1">
          <SearchInput
            placeholder="Rechercher par nom, référence ou code-barres…"
            aria-label="Rechercher un produit"
            defaultValue={searchParams.get("q") ?? ""}
            onChange={(e) => updateParam("q", e.target.value)}
          />
        </div>
        <Select aria-label="Catégorie" className={selectClass} defaultValue={searchParams.get("categorie") ?? ""} onChange={(e) => updateParam("categorie", e.target.value)}>
          <option value="">Catégorie : toutes</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select aria-label="Marque" className={selectClass} defaultValue={searchParams.get("marque") ?? ""} onChange={(e) => updateParam("marque", e.target.value)}>
          <option value="">Marque : toutes</option>
          {brands.map((b) => (
            <option key={b.id} value={b.name}>{b.name}</option>
          ))}
        </Select>
        {showPackagingFilter && (
          <Select aria-label="Conditionnement" className={selectClass} defaultValue={searchParams.get("conditionnement") ?? ""} onChange={(e) => updateParam("conditionnement", e.target.value)}>
            <option value="">Conditionnement : tous</option>
            <option value="avec">Avec conditionnement</option>
            <option value="sans">Sans conditionnement</option>
          </Select>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SearchInput
        placeholder="Rechercher par nom, référence, code-barres ou autre nom…"
        aria-label="Rechercher un produit"
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => updateParam("q", e.target.value)}
      />
      {compactOnMobile && (
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          aria-expanded={filtersOpen}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 sm:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filtres
          {activeFilters > 0 && (
            <span className="rounded-full bg-zindo-green-600 px-1.5 text-xs font-bold text-white">{activeFilters}</span>
          )}
        </button>
      )}
      <div className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${hideOnMobile}`}>
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
        className={`sm:w-48 ${compactOnMobile && !filtersOpen ? "hidden sm:block" : ""}`}
      >
        <option value="">Tous les statuts</option>
        <option value="stock-faible">Stock faible</option>
        <option value="rupture">En rupture</option>
      </Select>
    </div>
  );
}

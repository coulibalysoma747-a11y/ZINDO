"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { searchProductsAction } from "@/lib/actions/product-search";
import { formatMoney } from "@/lib/format";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";

type ProductResult = {
  id: string;
  name: string;
  reference: string;
  barcode: string | null;
  photoUrl?: string | null;
  salePrice: number;
  purchasePrice: number;
  quantity: number;
  unit: string;
};

export function ProductPicker({
  onSelect,
  locationId,
  currency = "XOF",
  placeholder = "Rechercher un produit par nom, référence ou code-barres...",
  autoFocus,
}: {
  onSelect: (product: ProductResult) => void;
  locationId: string;
  currency?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchProductsAction(query, locationId).then((products) => {
        setResults(products);
      });
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, locationId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="pl-9"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p);
                setQuery("");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-emerald-50"
            >
              <ProductThumbnail photoUrl={p.photoUrl} name={p.name} size={32} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-900">{p.name}</p>
                <p className="text-xs text-zinc-400">
                  {p.reference} · {p.quantity} {p.unit} en stock
                </p>
              </div>
              <span className="shrink-0 font-medium text-emerald-600">
                {formatMoney(p.salePrice, currency)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

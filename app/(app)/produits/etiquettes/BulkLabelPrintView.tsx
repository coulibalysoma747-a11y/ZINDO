"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Minus, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Empty";
import { formatMoney } from "@/lib/format";
import { BarcodeLabel, LABEL_DIMENSIONS, type LabelSize } from "@/components/products/BarcodeLabel";

type Product = { id: string; name: string; barcode: string | null; reference: string; salePrice: number };

const SIZE_OPTIONS: { value: LabelSize; label: string }[] = [
  { value: "40mm", label: "Petit" },
  { value: "50mm", label: "Moyen" },
  { value: "60mm", label: "Grand" },
];

/**
 * Impression groupée de codes-barres — pensée pour les produits qui n'en
 * ont pas encore : utilise leur référence ZND-xxxxxx (déjà unique, déjà
 * acceptée à la recherche/scan à la caisse — voir findProductByExactCodeAction)
 * comme code scannable, imprimée en CODE128 prête à coller sur le produit.
 * Aucune écriture en base : c'est la même logique que l'étiquette d'un seul
 * produit (components/products/BarcodeLabel.tsx), juste étendue à une
 * sélection de plusieurs produits à la fois.
 */
export function BulkLabelPrintView({
  products,
  businessName,
  currency,
}: {
  products: Product[];
  businessName: string;
  currency: string;
}) {
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(products.filter((p) => !p.barcode).map((p) => p.id)));
  const [size, setSize] = useState<LabelSize>("50mm");
  const [quantityPerProduct, setQuantityPerProduct] = useState(1);
  const [printMode, setPrintMode] = useState<"labels" | "a4">("labels");
  const { width, height } = LABEL_DIMENSIONS[size];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !onlyMissing || !p.barcode)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q));
  }, [products, onlyMissing, search]);

  const selectedProducts = products.filter((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    const allVisibleSelected = visible.every((p) => selected.has(p.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of visible) {
        if (allVisibleSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Deux façons d'imprimer : une étiquette autocollante par page (pour une
          imprimante d'étiquettes dédiée), ou plusieurs par feuille A4 (pour une
          imprimante classique — on les découpe ensuite). */}
      <style>{`
        @media print {
          ${
            printMode === "a4"
              ? `
          @page { size: A4; margin: 10mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden; }
          #zindo-bulk-labels, #zindo-bulk-labels * { visibility: visible; }
          #zindo-bulk-labels {
            position: absolute; top: 0; left: 0; margin: 0;
            display: flex; flex-wrap: wrap; gap: 3mm; align-content: flex-start;
          }
          .barcode-label { border: 1px dashed #bbb !important; break-inside: avoid; page-break-inside: avoid; }
          `
              : `
          @page { size: ${width}mm ${height}mm; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden; }
          #zindo-bulk-labels, #zindo-bulk-labels * { visibility: visible; }
          #zindo-bulk-labels { position: absolute; top: 0; left: 0; margin: 0; }
          .barcode-label { border: none !important; }
          .barcode-label:not(:last-child) { page-break-after: always; break-after: page; }
          `
          }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link href="/produits" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="h-4 w-4" /> Retour aux produits
          </Link>
          <h1 className="mt-2 text-xl font-bold text-zinc-900">Imprimer des codes-barres</h1>
          <p className="text-sm text-zinc-500">
            Un code-barres scannable est généré à partir de la référence pour chaque produit qui n&apos;en a pas.
          </p>
        </div>
      </div>

      <Card className="p-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyMissing(true)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                onlyMissing ? "bg-zindo-green-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              Sans code-barres uniquement
            </button>
            <button
              type="button"
              onClick={() => setOnlyMissing(false)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                !onlyMissing ? "bg-zindo-green-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              Tous les produits
            </button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrer..." className="pl-9" />
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title={onlyMissing ? "Tous vos produits ont déjà un code-barres" : "Aucun produit trouvé"}
            description={onlyMissing ? "Rien à imprimer ici." : undefined}
          />
        ) : (
          <>
            <label className="mt-4 flex items-center gap-2 border-b border-zinc-100 pb-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={visible.every((p) => selected.has(p.id))}
                onChange={toggleAllVisible}
                className="h-4 w-4 rounded accent-zindo-green-500"
              />
              Tout sélectionner ({visible.length})
            </label>
            <ul className="mt-2 max-h-72 divide-y divide-zinc-100 overflow-y-auto">
              {visible.map((p) => (
                <li key={p.id}>
                  <label className="flex items-center gap-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4 rounded accent-zindo-green-500"
                    />
                    <span className="min-w-0 flex-1 truncate text-zinc-900">{p.name}</span>
                    <span className="shrink-0 font-mono text-xs text-zinc-400">{p.barcode || p.reference}</span>
                    {!p.barcode && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Sans code-barres</span>}
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setPrintMode("labels")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  printMode === "labels" ? "bg-zindo-green-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                Étiquettes autocollantes
              </button>
              <button
                type="button"
                onClick={() => setPrintMode("a4")}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  printMode === "a4" ? "bg-zindo-green-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                Feuille A4
              </button>
            </div>
            <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1">
              {SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSize(opt.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    size === opt.value ? "bg-emerald-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-1">
              <button
                type="button"
                onClick={() => setQuantityPerProduct((q) => Math.max(1, q - 1))}
                className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100"
                aria-label="Diminuer la quantité"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="number"
                min={1}
                max={20}
                value={quantityPerProduct}
                onChange={(e) => setQuantityPerProduct(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                className="h-7 w-12 rounded border-0 text-center text-sm focus:outline-none"
                aria-label="Étiquettes par produit"
              />
              <button
                type="button"
                onClick={() => setQuantityPerProduct((q) => Math.min(20, q + 1))}
                className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100"
                aria-label="Augmenter la quantité"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="text-xs text-zinc-500">étiquette(s) par produit</span>
          </div>

          <Button disabled={selectedProducts.length === 0} onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimer {selectedProducts.length > 0 ? `(${selectedProducts.length * quantityPerProduct})` : ""}
          </Button>
        </div>
        {printMode === "a4" && (
          <p className="mt-2 text-xs text-zinc-400">
            Plusieurs étiquettes par feuille A4, sur une imprimante classique — un contour pointillé indique où découper.
          </p>
        )}
      </Card>

      <div id="zindo-bulk-labels" className="flex flex-wrap justify-center gap-3">
        {selectedProducts.flatMap((p) =>
          Array.from({ length: quantityPerProduct }).map((_, i) => (
            <BarcodeLabel
              key={`${p.id}-${i}`}
              size={size}
              data={{
                businessName,
                productName: p.name,
                code: p.barcode || p.reference,
                salePrice: p.salePrice,
                currency,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

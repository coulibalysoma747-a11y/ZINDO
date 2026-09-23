"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Minus, Plus, Search, QrCode, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Empty";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { ProductQrLabel, DEFAULT_LABEL_FIELDS, type LabelFieldOptions } from "@/components/products/ProductQrLabel";
import { LABEL_FORMATS, DEFAULT_FORMAT_ID, getLabelFormat, buildPrintCss } from "@/lib/label-formats";
import { ensureProductBarcodeAction, ensureAllProductBarcodesAction } from "@/lib/actions/products";
import { printDocument } from "@/lib/print";

type Product = { id: string; name: string; barcode: string | null; reference: string; salePrice: number; photoUrl: string | null };

const FIELD_TOGGLES: { key: keyof LabelFieldOptions; label: string }[] = [
  { key: "showProductName", label: "Nom du produit" },
  { key: "showPrice", label: "Prix" },
  { key: "showCodeText", label: "Code sous le QR" },
  { key: "showSku", label: "SKU" },
  { key: "cutMarks", label: "Traits de découpe" },
];

/**
 * Impression groupée de QR codes — pensée pour les produits qui n'en ont pas
 * encore. ZINDO génère lui-même un vrai code-barres EAN-13 (jamais la
 * référence/SKU du produit) pour chaque produit qui n'en a pas, l'enregistre
 * sur le produit, puis encode ce code dans un QR (scannable au téléphone
 * comme à la caisse, sans douchette dédiée) — voir
 * lib/reference.ts::generateProductBarcode et lib/actions/products.ts.
 */
export function BulkLabelPrintView({
  products: initialProducts,
  businessName,
  currency,
}: {
  products: Product[];
  businessName: string;
  currency: string;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formatId, setFormatId] = useState(DEFAULT_FORMAT_ID);
  const [quantityPerProduct, setQuantityPerProduct] = useState(1);
  const [fields, setFields] = useState<LabelFieldOptions>(DEFAULT_LABEL_FIELDS);
  const [generating, setGenerating] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const format = getLabelFormat(formatId);

  const missingCount = products.filter((p) => !p.barcode).length;

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !onlyMissing || !p.barcode)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q));
  }, [products, onlyMissing, search]);

  const selectedProducts = products.filter((p) => selected.has(p.id));

  function selectAllFiltered() {
    setSelected(new Set(visible.map((p) => p.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleField(key: keyof LabelFieldOptions) {
    setFields((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSaveAllMissing() {
    setSavingAll(true);
    const result = await ensureAllProductBarcodesAction();
    if ("generated" in result && result.generated.length > 0) {
      const map = new Map(result.generated.map((g) => [g.id, g.barcode]));
      setProducts((prev) => prev.map((p) => (map.has(p.id) ? { ...p, barcode: map.get(p.id)! } : p)));
    }
    setSavingAll(false);
  }

  async function handlePrint() {
    const missing = products.filter((p) => selected.has(p.id) && !p.barcode);
    if (missing.length > 0) {
      setGenerating(true);
      const results = await Promise.all(missing.map((p) => ensureProductBarcodeAction(p.id).then((r) => [p.id, r] as const)));
      setProducts((prev) =>
        prev.map((p) => {
          const found = results.find(([id]) => id === p.id);
          return found && "barcode" in found[1] ? { ...p, barcode: found[1].barcode } : p;
        })
      );
      setGenerating(false);
    }
    // Laisse React repeindre les nouveaux codes avant d'ouvrir la boîte d'impression.
    requestAnimationFrame(() =>
      printDocument(format.kind === "roll" ? { widthMm: format.widthMm, heightMm: format.heightMm } : "A4")
    );
  }

  return (
    <div className="space-y-4">
      <style>{`@media print { ${buildPrintCss(format, "zindo-bulk-labels")} }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link href="/produits" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
            <ArrowLeft className="h-4 w-4" /> Retour aux produits
          </Link>
          <h1 className="mt-2 text-xl font-bold text-zinc-900">QR codes</h1>
          <p className="text-sm text-zinc-500">Imprimer des étiquettes QR code par produit</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button variant="outline" onClick={selectAllFiltered}>
          Tout sélectionner (filtre)
        </Button>
        <Button variant="outline" onClick={clearSelection}>
          Vider la sélection
        </Button>
        <Button disabled={selectedProducts.length === 0 || generating} onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          {generating
            ? "Génération des QR codes..."
            : `Imprimer (${selectedProducts.length * quantityPerProduct})`}
        </Button>
      </div>

      {missingCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-zindo-green-200 bg-zindo-green-50 px-4 py-3 print:hidden">
          <button
            type="button"
            onClick={handleSaveAllMissing}
            disabled={savingAll}
            className="flex items-center gap-2 text-sm font-semibold text-zindo-green-800 hover:text-zindo-green-900 disabled:opacity-60"
          >
            <QrCode className="h-4 w-4" />
            {savingAll ? "Enregistrement..." : `Enregistrer tous les codes manquants (${missingCount})`}
          </button>
        </div>
      )}

      <Card className="p-4 print:hidden">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Format d&apos;impression</h2>
        <Select value={formatId} onChange={(e) => setFormatId(e.target.value)}>
          {LABEL_FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-xs text-zinc-500">
          {format.widthMm} × {format.heightMm} mm
          {format.kind === "roll" && " · une étiquette par page, pour imprimante d'étiquettes dédiée"}
          {format.kind === "sheet" && ` · planche A4 ${format.cols} × ${format.rows} (${format.cols * format.rows}/feuille)`}
          {format.kind === "free" && " · remplit la largeur disponible de la feuille"}
        </p>

        <h2 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">Sur l&apos;étiquette</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FIELD_TOGGLES.map((t) => (
            <label key={t.key} className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={fields[t.key]}
                onChange={() => toggleField(t.key)}
                className="h-4 w-4 rounded accent-zindo-green-500"
              />
              {t.label}
            </label>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-4">
          <span className="text-sm text-zinc-600">Exemplaires par produit</span>
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
              max={40}
              value={quantityPerProduct}
              onChange={(e) => setQuantityPerProduct(Math.min(40, Math.max(1, Number(e.target.value) || 1)))}
              className="h-7 w-12 rounded border-0 text-center text-sm focus:outline-none"
              aria-label="Étiquettes par produit"
            />
            <button
              type="button"
              onClick={() => setQuantityPerProduct((q) => Math.min(40, q + 1))}
              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100"
              aria-label="Augmenter la quantité"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Card>

      <div className="print:hidden">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Aperçu à taille réelle</h2>
        {selectedProducts.length === 0 ? (
          <Card className="p-6 text-center text-sm text-zinc-400">Sélectionnez des produits pour voir l&apos;aperçu avant impression.</Card>
        ) : (
          <Card className="flex flex-wrap justify-center gap-2 bg-zinc-50 p-4">
            {selectedProducts.slice(0, 8).map((p) => (
              <ProductQrLabel
                key={p.id}
                widthMm={format.widthMm}
                heightMm={format.heightMm}
                fields={fields}
                data={{
                  businessName,
                  productName: p.name,
                  code: p.barcode || p.reference,
                  sku: p.reference,
                  salePrice: p.salePrice,
                  currency,
                }}
              />
            ))}
          </Card>
        )}
      </div>

      <div className="print:hidden">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, SKU, code-barres..."
            className="pl-9"
          />
        </div>
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyMissing(true)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              onlyMissing ? "bg-zindo-green-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Sans QR code uniquement
          </button>
          <button
            type="button"
            onClick={() => setOnlyMissing(false)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              !onlyMissing ? "bg-zindo-green-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Tous les produits
          </button>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title={onlyMissing ? "Tous vos produits ont déjà un QR code" : "Aucun produit trouvé"}
          />
        ) : (
          <Card className="max-h-96 overflow-y-auto p-0">
            <Table>
              <TableHead className="sticky top-0 z-10">
                <TableRow interactive={false}>
                  <TableHeaderCell className="w-12">Sél.</TableHeaderCell>
                  <TableHeaderCell className="w-16">Miniat.</TableHeaderCell>
                  <TableHeaderCell>Produit</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="h-4 w-4 rounded accent-zindo-green-500"
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <ProductThumbnail photoUrl={p.photoUrl} name={p.name} size={32} />
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <p className="font-medium text-zinc-900 dark:text-slate-100">{p.name}</p>
                      <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                        {p.reference}
                        {!p.barcode && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            Sans QR code
                          </span>
                        )}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <div id="zindo-bulk-labels" className="hidden print:flex print:flex-wrap">
        {selectedProducts.flatMap((p) =>
          Array.from({ length: quantityPerProduct }).map((_, i) => (
            <ProductQrLabel
              key={`${p.id}-${i}`}
              widthMm={format.widthMm}
              heightMm={format.heightMm}
              fields={fields}
              data={{
                businessName,
                productName: p.name,
                code: p.barcode || p.reference,
                sku: p.reference,
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

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud, X, ImageOff, Check } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { formatMoney } from "@/lib/format";
import {
  analyzeCatalogPdfAction,
  importCatalogProductsAction,
  type ExtractedImage,
  type ImportCatalogResult,
} from "@/lib/actions/catalog-import";

type Row = {
  key: string;
  included: boolean;
  name: string;
  reference: string;
  unit: string;
  purchasePrice: string;
  salePrice: string;
  description: string;
  imageIndex: number | null;
};

type Step = "upload" | "review" | "done";

export function CatalogImportWizard({ currency }: { currency: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [result, setResult] = useState<ImportCatalogResult | null>(null);
  const [openPicker, setOpenPicker] = useState<string | null>(null);

  async function handleAnalyze(formData: FormData) {
    setError(null);
    setAnalyzing(true);
    const res = await analyzeCatalogPdfAction(formData);
    setAnalyzing(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setImages(res.images);
    setRows(
      res.products.map((p, i) => ({
        key: `${i}-${p.name}`,
        included: true,
        name: p.name,
        reference: p.reference ?? "",
        unit: p.unit ?? "unité",
        purchasePrice: p.purchasePrice != null ? String(p.purchasePrice) : "",
        salePrice: p.salePrice != null ? String(p.salePrice) : "",
        description: p.description ?? "",
        imageIndex: null,
      }))
    );
    setStep("review");
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  async function handleImport() {
    setError(null);
    const included = rows.filter((r) => r.included);
    if (included.length === 0) {
      setError("Sélectionnez au moins un produit à importer");
      return;
    }
    setImporting(true);
    const payload = included.map((r) => ({
      name: r.name,
      reference: r.reference || undefined,
      unit: r.unit || "unité",
      purchasePrice: r.purchasePrice ? Number(r.purchasePrice) : 0,
      salePrice: r.salePrice ? Number(r.salePrice) : 0,
      description: r.description || undefined,
      imageDataUrl: r.imageIndex != null ? images[r.imageIndex]?.dataUrl : undefined,
    }));
    const res = await importCatalogProductsAction(payload);
    setImporting(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setResult(res.result);
    setStep("done");
    router.refresh();
  }

  if (step === "done" && result) {
    return (
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zindo-green-50 text-zindo-green-600">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900">{result.createdCount} produit(s) importé(s)</p>
            {result.skipped.length > 0 && (
              <p className="text-sm text-zinc-500">{result.skipped.length} ignoré(s) — voir détail ci-dessous</p>
            )}
          </div>
        </div>
        {result.skipped.length > 0 && (
          <ul className="space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            {result.skipped.map((s, i) => (
              <li key={i}>
                {s.name} — {s.reason}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <ButtonLink href="/produits" className="w-full sm:w-auto">
            Voir mes produits
          </ButtonLink>
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            onClick={() => {
              setStep("upload");
              setRows([]);
              setImages([]);
              setResult(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            Importer un autre catalogue
          </Button>
        </div>
      </div>
    );
  }

  if (step === "review") {
    const includedCount = rows.filter((r) => r.included).length;
    return (
      <div className="space-y-4">
        <p className="text-sm text-zinc-500">
          {rows.length} produit(s) détecté(s){images.length > 0 ? ` · ${images.length} photo(s) trouvée(s) dans le PDF` : ""}.
          Corrigez ce qui est nécessaire, décochez ce que vous ne voulez pas importer.
        </p>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.key}
              className={`rounded-2xl border p-4 transition ${row.included ? "border-zinc-200 bg-white" : "border-zinc-100 bg-zinc-50 opacity-60"}`}
            >
              {/* En-tête de carte : case à cocher, photo, retirer — toujours sur une
                  seule ligne compacte, y compris sur téléphone. Les champs passent
                  en dessous, sur toute la largeur, pour ne jamais se retrouver
                  écrasés dans une rangée trop étroite sur petit écran. */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={row.included}
                  onChange={(e) => updateRow(row.key, { included: e.target.checked })}
                  className="h-5 w-5 shrink-0 rounded accent-zindo-green-500"
                />

                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenPicker(openPicker === row.key ? null : row.key)}
                    className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 hover:border-zindo-green-300"
                    title="Choisir une photo"
                  >
                    {row.imageIndex != null && images[row.imageIndex] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={images[row.imageIndex].dataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageOff className="h-5 w-5 text-zinc-300" />
                    )}
                  </button>
                  {openPicker === row.key && (
                    <div className="absolute left-0 top-[calc(100%+4px)] z-10 w-64 max-w-[calc(100vw-3rem)] rounded-xl border border-zinc-200 bg-white p-2 shadow-lg">
                      <p className="mb-1.5 px-1 text-xs font-medium text-zinc-500">Choisir une photo</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            updateRow(row.key, { imageIndex: null });
                            setOpenPicker(null);
                          }}
                          className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-300 hover:border-red-300 hover:text-red-400"
                          title="Aucune"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {images.map((img) => (
                          <button
                            key={img.index}
                            type="button"
                            onClick={() => {
                              updateRow(row.key, { imageIndex: img.index });
                              setOpenPicker(null);
                            }}
                            className="h-12 w-12 overflow-hidden rounded-lg border border-zinc-200 hover:border-zindo-green-400"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.dataUrl} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                      {images.length === 0 && <p className="px-1 py-2 text-xs text-zinc-400">Aucune photo trouvée dans le PDF</p>}
                    </div>
                  )}
                </div>

                <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-700 sm:hidden">
                  {row.name || "Sans nom"}
                </span>

                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="ml-auto shrink-0 rounded-lg p-1.5 text-zinc-300 hover:bg-red-50 hover:text-red-500"
                  title="Retirer cette ligne"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="Nom" htmlFor={`name-${row.key}`}>
                  <Input
                    id={`name-${row.key}`}
                    value={row.name}
                    onChange={(e) => updateRow(row.key, { name: e.target.value })}
                  />
                </Field>
                <Field label="Référence (facultatif)" htmlFor={`ref-${row.key}`}>
                  <Input
                    id={`ref-${row.key}`}
                    value={row.reference}
                    placeholder="générée automatiquement si vide"
                    onChange={(e) => updateRow(row.key, { reference: e.target.value })}
                  />
                </Field>
                <Field label="Unité" htmlFor={`unit-${row.key}`}>
                  <Input
                    id={`unit-${row.key}`}
                    value={row.unit}
                    onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Prix d'achat" htmlFor={`pp-${row.key}`}>
                    <Input
                      id={`pp-${row.key}`}
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={row.purchasePrice}
                      onChange={(e) => updateRow(row.key, { purchasePrice: e.target.value })}
                    />
                  </Field>
                  <Field label="Prix de vente" htmlFor={`sp-${row.key}`}>
                    <Input
                      id={`sp-${row.key}`}
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={row.salePrice}
                      onChange={(e) => updateRow(row.key, { salePrice: e.target.value })}
                    />
                  </Field>
                </div>
                {row.salePrice && (
                  <p className="col-span-full -mt-1 text-xs text-zinc-400">
                    Prix de vente : {formatMoney(Number(row.salePrice) || 0, currency)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {rows.length === 0 && <p className="text-sm text-zinc-500">Toutes les lignes ont été retirées.</p>}

        <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-zinc-100 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:items-center sm:gap-3 sm:bg-transparent sm:px-0 sm:pt-4 sm:backdrop-blur-none">
          <Button className="w-full sm:w-auto" onClick={handleImport} disabled={importing || includedCount === 0}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Import en cours...
              </>
            ) : (
              `Importer ${includedCount} produit(s)`
            )}
          </Button>
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            disabled={importing}
            onClick={() => {
              setStep("upload");
              setRows([]);
              setImages([]);
              setError(null);
            }}
          >
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      action={handleAnalyze}
      className="space-y-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center sm:p-8"
    >
      <UploadCloud className="mx-auto h-8 w-8 text-zinc-400" />
      <div>
        <label
          htmlFor="pdf-input"
          className="cursor-pointer font-medium text-zindo-green-600 hover:text-zindo-green-700"
        >
          Choisir un fichier PDF
        </label>
        <input ref={fileInputRef} id="pdf-input" name="pdf" type="file" accept="application/pdf" required className="hidden" />
        <p className="mt-1 text-xs text-zinc-500">4 Mo maximum — catalogue, liste de prix, tarif fournisseur...</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <Button type="submit" disabled={analyzing}>
        {analyzing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Analyse du PDF par l&apos;IA...
          </>
        ) : (
          "Analyser le PDF"
        )}
      </Button>
      <p className="text-xs text-zinc-400">
        L&apos;IA peut se tromper sur un prix ou un nom — vous pourrez tout relire et corriger à l&apos;étape
        suivante, avant que rien ne soit enregistré.
      </p>
    </form>
  );
}

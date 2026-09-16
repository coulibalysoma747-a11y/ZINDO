"use client";

import { useActionState } from "react";
import Link from "next/link";
import { UploadCloud, Download } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { importProductsCsvAction, type ImportCsvResult } from "@/lib/actions/products-import-csv";

export function ImportCsvForm() {
  const [state, formAction, pending] = useActionState<ImportCsvResult | undefined, FormData>(
    importProductsCsvAction,
    undefined
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3 text-sm text-zinc-600">
          <p>
            Colonnes attendues (dans cet ordre, en-tête inclus) : <code className="text-xs">reference,nom,categorie,marque,unite,prix_achat,prix_vente,stock_minimum,code_barres,actif</code>.
          </p>
          <p>
            Seules <code className="text-xs">nom</code> et <code className="text-xs">prix_vente</code> sont
            obligatoires. Une référence déjà existante met à jour le produit ; sinon un nouveau produit est créé
            (référence générée automatiquement si laissée vide).
          </p>
          <p className="font-medium text-amber-700">
            Tout ou rien : si une seule ligne est invalide, rien n&apos;est importé.
          </p>
          <Link
            href="/produits/export"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zindo-green-600 hover:underline"
          >
            <Download className="h-3.5 w-3.5" /> Exporter mon catalogue actuel pour voir le format
          </Link>
        </CardBody>
      </Card>

      <form action={formAction} className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 p-8 text-center hover:border-zindo-green-400">
          <UploadCloud className="h-8 w-8 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700">Choisir un fichier CSV</span>
          <input type="file" name="file" accept=".csv,text/csv" required className="hidden" />
        </label>

        {state && !state.success && (
          <div className="space-y-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{state.error}</p>
            {state.rowErrors && (
              <ul className="list-disc space-y-0.5 pl-5 text-xs">
                {state.rowErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {state?.success && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {state.created} produit(s) créé(s), {state.updated} mis à jour.
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Import en cours..." : "Importer"}
        </Button>
      </form>
    </div>
  );
}

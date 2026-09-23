import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { ensureCsvQuantitiesFlagRegistered } from "@/lib/actions/products-import-csv";
import { PERMISSIONS } from "@/lib/permissions";
import { ImportCsvForm } from "./ImportCsvForm";

// Un import avec quantités fait un ajustement de stock par ligne — plusieurs
// centaines de lignes dépassent vite la durée par défaut.
export const maxDuration = 300;

export default async function ImportProductsCsvPage() {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  await ensureCsvQuantitiesFlagRegistered();
  const quantitiesEnabled = await isFeatureEnabled("import_csv_quantites", user.businessId);

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/produits" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux produits
      </Link>
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Importer un catalogue CSV</h1>
        <p className="text-sm text-zinc-500">
          Créez ou mettez à jour plusieurs produits d&apos;un coup depuis un fichier CSV (Excel, Google Sheets...).
        </p>
      </div>
      <ImportCsvForm quantitiesEnabled={quantitiesEnabled} />
    </div>
  );
}

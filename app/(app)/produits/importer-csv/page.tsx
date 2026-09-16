import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ImportCsvForm } from "./ImportCsvForm";

export default async function ImportProductsCsvPage() {
  await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);

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
      <ImportCsvForm />
    </div>
  );
}

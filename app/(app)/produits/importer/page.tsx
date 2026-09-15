import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { ensureCatalogImportFlagRegistered } from "@/lib/actions/catalog-import";
import { isAssistantConfigured } from "@/lib/ai/client";
import { EmptyState } from "@/components/ui/Empty";
import { CatalogImportWizard } from "./CatalogImportWizard";

// L'analyse d'un PDF par l'IA (+ extraction des images) peut dépasser la
// durée par défaut d'une fonction Vercel (10s) — on l'étend pour cette route.
export const maxDuration = 60;

export default async function ImportCatalogPage() {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  await ensureCatalogImportFlagRegistered();
  const enabled = await isFeatureEnabled("import_catalogue_pdf", user.businessId);

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/produits" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" /> Retour aux produits
      </Link>

      <div>
        <h1 className="text-xl font-bold text-zinc-900">Importer un catalogue (PDF)</h1>
        <p className="text-sm text-zinc-500">
          Déposez un catalogue ou une liste de prix fournisseur en PDF — l&apos;IA en extrait les produits
          (nom, prix, référence) et les photos qu&apos;il contient, que vous pourrez relire et corriger avant
          de les enregistrer.
        </p>
      </div>

      {!enabled ? (
        <EmptyState
          title="Fonctionnalité pas encore disponible"
          description="L'import de catalogue PDF n'est pas encore activé pour votre compte. Contactez l'administrateur de la plateforme si vous souhaitez y avoir accès."
        />
      ) : !isAssistantConfigured() ? (
        <EmptyState
          title="Extraction IA non configurée"
          description="Cette fonctionnalité nécessite une clé ANTHROPIC_API_KEY côté serveur. Contactez l'administrateur de la plateforme."
        />
      ) : (
        <CatalogImportWizard currency={user.business.currency} />
      )}
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getCurrentLocation } from "@/lib/location";
import { ensureFasoFileSyncFlagRegistered } from "@/lib/actions/faso-stock-file";
import { getFasoSyncStatus } from "@/lib/faso-stock-file-sync";
import { EmptyState } from "@/components/ui/Empty";
import { FasoStockSyncPanel } from "./FasoStockSyncPanel";

// Une réception ajuste le stock produit par produit — plus d'un millier de
// lignes dépassent vite la durée par défaut d'une fonction.
export const maxDuration = 300;

export default async function FasoStockFileSyncPage() {
  const user = await requirePermission(PERMISSIONS.STOCK_MANAGE);
  await ensureFasoFileSyncFlagRegistered();
  const enabled = await isFeatureEnabled("synchro_fasostock_fichier", user.businessId);
  const location = enabled ? await getCurrentLocation(user.businessId) : null;
  const status = location ? await getFasoSyncStatus(user.businessId, location.id) : null;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/stock" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="h-4 w-4" /> Retour au stock
      </Link>
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Synchro FasoStock</h1>
        <p className="text-sm text-zinc-500">
          Utilisez FasoStock et ZINDO en même temps : les deux gardent le même stock
          {location ? <> (boutique « {location.name} »)</> : null}.
        </p>
      </div>

      {!enabled || !location ? (
        <EmptyState
          title="Fonctionnalité pas encore disponible"
          description="La synchro FasoStock n'est pas encore activée pour votre compte. Contactez l'administrateur de la plateforme."
        />
      ) : (
        <FasoStockSyncPanel receivedAt={status?.receivedAt ?? null} sentAt={status?.sentAt ?? null} />
      )}
    </div>
  );
}

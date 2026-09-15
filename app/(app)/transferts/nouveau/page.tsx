import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getLocations, getCurrentLocation } from "@/lib/location";
import { EmptyState } from "@/components/ui/Empty";
import { TransferForm } from "./TransferForm";

// Voir app/(app)/achats/nouveau/page.tsx pour l'explication.
export const maxDuration = 30;

export default async function NewTransferPage({
  searchParams,
}: {
  searchParams: Promise<{ produit?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.TRANSFERS_MANAGE);
  const { produit } = await searchParams;

  const [locations, currentLocation, initialProductRes] = await Promise.all([
    getLocations(user.businessId),
    getCurrentLocation(user.businessId),
    produit
      ? supabase.from("products").select("id, reference").eq("id", produit).eq("business_id", user.businessId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const initialProduct = initialProductRes.data as { id: string; reference: string } | null;

  if (locations.length < 2) {
    return (
      <EmptyState
        title="Une seule boutique configurée"
        description="Créez au moins une deuxième boutique ou un dépôt pour pouvoir transférer du stock."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Nouveau transfert</h1>
        <p className="text-sm text-zinc-500">
          Déplacez de la marchandise d&apos;une boutique ou d&apos;un dépôt vers un autre.
        </p>
      </div>
      <TransferForm
        locations={locations}
        defaultFromLocationId={currentLocation?.id}
        initialProduct={initialProduct}
      />
    </div>
  );
}

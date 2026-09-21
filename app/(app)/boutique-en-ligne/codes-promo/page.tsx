import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/Empty";
import { OnlineStoreTabs } from "../OnlineStoreTabs";
import { listPromoCodesAction } from "@/lib/actions/promo-codes";
import { PromoCodesList } from "./PromoCodesList";

export default async function PromoCodesPage() {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const enabled = await isFeatureEnabled("boutique_en_ligne", user.businessId);
  if (!enabled) {
    return (
      <EmptyState
        title="Fonctionnalité pas encore disponible"
        description="La Boutique en ligne n'est pas encore activée pour votre compte. Contactez l'administrateur de la plateforme si vous souhaitez y avoir accès."
      />
    );
  }

  const { data: store } = await supabase
    .from("online_stores")
    .select("id")
    .eq("business_id", user.businessId)
    .maybeSingle();

  const [{ count: pendingOrders }, promoCodes] = await Promise.all([
    store
      ? supabase.from("online_orders").select("id", { count: "exact", head: true }).eq("store_id", store.id).eq("status", "EN_ATTENTE")
      : Promise.resolve({ count: 0 }),
    listPromoCodesAction(),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Boutique en ligne</h1>
        <p className="text-sm text-zinc-500">
          Créez des codes que vos clients saisissent au moment de commander sur votre boutique en ligne.
        </p>
      </div>

      <OnlineStoreTabs active="codes-promo" pendingCount={pendingOrders ?? 0} />

      {!store ? (
        <EmptyState
          title="Créez d'abord votre boutique en ligne"
          description="L'onglet « Ma vitrine » vous permet de créer votre boutique. Vous pourrez ensuite y ajouter des codes promo."
        />
      ) : (
        <PromoCodesList promoCodes={promoCodes} />
      )}
    </div>
  );
}

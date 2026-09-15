import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getCurrentLocation } from "@/lib/location";
import { ensureQuoteFlagRegistered, isQuoteModuleEnabled } from "@/lib/actions/quotes";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import type { PosProduct } from "@/components/products/ProductGrid";
import { DevisForm } from "./DevisForm";

export default async function NouveauDevisPage() {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  await ensureQuoteFlagRegistered();
  const enabled = await isQuoteModuleEnabled(user.businessId);

  if (!enabled) {
    return (
      <EmptyState
        title="Fonctionnalité pas encore disponible"
        description="Le module Devis n'est pas encore activé pour votre compte. Contactez l'administrateur de la plateforme si vous souhaitez y avoir accès."
      />
    );
  }

  const currentLocation = await getCurrentLocation(user.businessId);
  if (!currentLocation) {
    return (
      <EmptyState
        title="Aucune boutique configurée"
        description="Créez une boutique avant de préparer un devis."
        action={<ButtonLink href="/boutiques">Configurer une boutique</ButtonLink>}
      />
    );
  }

  const [{ data: customers }, { data: products }, { data: stocks }] = await Promise.all([
    supabase.from("customers").select("id, name, phone").eq("business_id", user.businessId).order("name", { ascending: true }),
    supabase
      .from("products")
      .select(
        "id, reference, name, barcode, photoUrl:photo_url, salePrice:sale_price, purchasePrice:purchase_price, unit, trackUnits:track_units"
      )
      .eq("business_id", user.businessId)
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase.from("product_stocks").select("productId:product_id, quantity").eq("location_id", currentLocation.id),
  ]);

  const stockMap = new Map(((stocks ?? []) as Array<{ productId: string; quantity: number }>).map((s) => [s.productId, s.quantity]));
  const posProducts: PosProduct[] = ((products ?? []) as unknown as Omit<PosProduct, "quantity">[]).map((p) => ({
    ...p,
    quantity: stockMap.get(p.id) ?? 0,
  }));

  return (
    <DevisForm
      locationId={currentLocation.id}
      currency={user.business.currency}
      customers={customers ?? []}
      posProducts={posProducts}
    />
  );
}

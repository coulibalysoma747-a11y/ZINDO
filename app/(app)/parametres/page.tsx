import Link from "next/link";
import { Pencil } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { findActivity } from "@/lib/activities";
import { getLocations } from "@/lib/location";
import { getInvoiceCustomization } from "@/lib/invoice-customization";
import { getBusinessSettings } from "@/lib/business-settings";
import { listFasoStockStores, type FasoStockStore } from "@/lib/integrations/faso-stock";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { BusinessSettingsForm } from "./BusinessSettingsForm";
import { PaymentMethodsPanel } from "./PaymentMethodsPanel";
import { PermissionsPanel } from "./PermissionsPanel";
import { FasoStockPanel } from "./FasoStockPanel";
import { BusinessRulesPanel } from "./BusinessRulesPanel";
import { SalesLeaderboardPanel } from "./SalesLeaderboardPanel";
import { ModuleTogglesPanel } from "./ModuleTogglesPanel";
import { UnclaimedGoodsPanel } from "./UnclaimedGoodsPanel";
import { PaymentBreakdownPanel } from "./PaymentBreakdownPanel";
import { ExpenseCategoriesPanel } from "./ExpenseCategoriesPanel";
import { PackagingPriceModePanel } from "./PackagingPriceModePanel";
import type { PaymentMethod, Role } from "@/lib/db-types";

// La synchronisation FasoStock déclenchée depuis cette page peut porter sur
// des milliers de produits (pagination + écritures par lots) — au-delà de la
// durée par défaut d'une fonction Vercel (10s).
export const maxDuration = 120;

const ALL_METHODS: { method: PaymentMethod; defaultLabel: string }[] = [
  { method: "ESPECES", defaultLabel: "Espèces" },
  { method: "MOBILE_MONEY", defaultLabel: "Mobile Money" },
  { method: "CARTE", defaultLabel: "Carte bancaire" },
  { method: "CREDIT", defaultLabel: "Crédit" },
  { method: "AUTRE", defaultLabel: "Autre" },
];

export default async function SettingsPage() {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const [{ data: configs }, { data: overrides }, { data: businessRow }, locations, invoiceCustomization, businessSettings] =
    await Promise.all([
      supabase.from("payment_method_configs").select("method, label, enabled").eq("business_id", user.businessId),
      supabase.from("role_permissions").select("role, permission, allowed").eq("business_id", user.businessId),
      supabase
        .from("businesses")
        .select(
          "fasoStockApiKey:faso_stock_api_key, fasoStockStoreMapping:faso_stock_store_mapping, fasoStockLastSyncAt:faso_stock_last_sync_at, fasoStockLastSyncStatus:faso_stock_last_sync_status, fasoStockLastSyncError:faso_stock_last_sync_error"
        )
        .eq("id", user.businessId)
        .maybeSingle(),
      getLocations(user.businessId),
      getInvoiceCustomization(user.businessId),
      getBusinessSettings(user.businessId),
    ]);

  const configMap = new Map((configs ?? []).map((c) => [c.method as string, c]));
  const paymentMethods = ALL_METHODS.map(({ method, defaultLabel }) => ({
    method,
    label: (configMap.get(method)?.label as string | undefined) ?? defaultLabel,
    enabled: (configMap.get(method)?.enabled as boolean | undefined) ?? method !== "AUTRE",
  }));

  const activity = findActivity(user.business.activityKey);

  const fasoStockApiKey = businessRow?.fasoStockApiKey as string | null;
  let fasoStockStores: FasoStockStore[] = [];
  if (fasoStockApiKey) {
    try {
      fasoStockStores = await listFasoStockStores(fasoStockApiKey);
    } catch {
      // La clé peut avoir été révoquée depuis — le panneau proposera de
      // recharger, ce qui remontera l'erreur exacte à l'utilisateur.
    }
  }
  let fasoStockMapping: Record<string, string> = {};
  try {
    fasoStockMapping = businessRow?.fasoStockStoreMapping ? JSON.parse(businessRow.fasoStockStoreMapping as string) : {};
  } catch {
    fasoStockMapping = {};
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Paramètres</h1>
        <p className="text-sm text-zinc-500">Configurez votre commerce, vos moyens de paiement et vos permissions.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Mon activité</h2>
        </CardHeader>
        <CardBody className="flex items-center justify-between gap-3">
          {activity ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activity.emoji}</span>
              <div>
                <p className="font-medium text-zinc-900">{activity.label}</p>
                <p className="text-xs text-zinc-500">{activity.description}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Aucune activité définie.</p>
          )}
          <Link
            href="/choisir-activite?change=1"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Commerce</h2>
        </CardHeader>
        <CardBody>
          <BusinessSettingsForm business={{ ...user.business, ...invoiceCustomization }} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Moyens de paiement</h2>
        </CardHeader>
        <CardBody>
          <PaymentMethodsPanel methods={paymentMethods} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Intégration FasoStock</h2>
        </CardHeader>
        <CardBody>
          <FasoStockPanel
            initiallyConnected={!!fasoStockApiKey}
            initialStores={fasoStockStores}
            locations={locations.map((l) => ({ id: l.id as string, name: l.name as string }))}
            initialMapping={fasoStockMapping}
            lastSyncAt={(businessRow?.fasoStockLastSyncAt as string | null) ?? null}
            lastSyncStatus={(businessRow?.fasoStockLastSyncStatus as string | null) ?? null}
            lastSyncError={(businessRow?.fasoStockLastSyncError as string | null) ?? null}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Devise</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-zinc-500">
            La monnaie utilisée dans toute l&apos;application : caisse, factures, reçus, rapports.
          </p>
          <p className="mt-2 text-sm font-medium text-zinc-900">
            Devise actuelle : {user.business.currency === "XOF" ? "Franc CFA (UEMOA) (FCFA)" : user.business.currency}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Une fois des ventes enregistrées, la devise ne peut plus être modifiée sans fausser l&apos;historique.
            Contactez le support si un changement est réellement nécessaire.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Règles de vente</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <BusinessRulesPanel settings={businessSettings} />
          <SalesLeaderboardPanel settings={businessSettings} />
          <UnclaimedGoodsPanel settings={businessSettings} />
          <PaymentBreakdownPanel settings={businessSettings} />
          <ExpenseCategoriesPanel categories={businessSettings.expenseCategories} />
          <PackagingPriceModePanel settings={businessSettings} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Modules</h2>
        </CardHeader>
        <CardBody>
          <ModuleTogglesPanel settings={businessSettings} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Rôles et permissions</h2>
        </CardHeader>
        <CardBody>
          <PermissionsPanel
            overrides={(overrides ?? []) as unknown as { role: Role; permission: string; allowed: boolean }[]}
          />
        </CardBody>
      </Card>
    </div>
  );
}

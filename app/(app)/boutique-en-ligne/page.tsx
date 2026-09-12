import { headers } from "next/headers";
import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getLocations } from "@/lib/location";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { OnlineStoreForm } from "./OnlineStoreForm";

export default async function OnlineStorePage() {
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

  const [store, locations, pendingOrders] = await Promise.all([
    prisma.onlineStore.findUnique({ where: { businessId: user.businessId } }),
    getLocations(user.businessId),
    prisma.onlineOrder.count({
      where: { store: { businessId: user.businessId }, status: "EN_ATTENTE" },
    }),
  ]);

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const publicUrl = store ? `${protocol}://${host}/boutique/${store.slug}` : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-orange-500" />
            <h1 className="text-xl font-bold text-zinc-900">Boutique en ligne</h1>
          </div>
          <p className="text-sm text-zinc-500">
            Configurez votre vitrine, partagez le lien à vos clients, et laissez-les commander en ligne.
          </p>
        </div>
        <ButtonLink href="/boutique-en-ligne/commandes" variant="outline">
          Commandes {pendingOrders > 0 && `(${pendingOrders} en attente)`}
        </ButtonLink>
      </div>

      {publicUrl && store?.published && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardBody className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Votre boutique est en ligne
              </p>
              <Link href={publicUrl} target="_blank" className="text-sm font-medium text-emerald-800 hover:underline">
                {publicUrl}
              </Link>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-zinc-900">Configuration</h2>
        </CardHeader>
        <CardBody>
          <OnlineStoreForm
            store={store}
            locations={locations.map((l) => ({ id: l.id, name: l.name }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}

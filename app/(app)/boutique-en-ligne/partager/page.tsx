import { headers } from "next/headers";
import { ShoppingBasket, Receipt, ShoppingBag, Ticket } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { OnlineStoreTabs } from "../OnlineStoreTabs";
import { SharePanel } from "./SharePanel";

export default async function ShareOnlineStorePage() {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  const enabled = await isFeatureEnabled("boutique_en_ligne", user.businessId);
  if (!enabled) {
    return (
      <EmptyState
        title="Fonctionnalité pas encore disponible"
        description="La Boutique en ligne n'est pas encore activée pour votre compte."
      />
    );
  }

  const { data: storeData } = await supabase
    .from("online_stores")
    .select("id, slug, storeName:store_name, published")
    .eq("business_id", user.businessId)
    .maybeSingle();
  const store = storeData as unknown as { id: string; slug: string; storeName: string; published: boolean } | null;

  const { count: pendingOrders } = store
    ? await supabase
        .from("online_orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("status", "EN_ATTENTE")
    : { count: 0 };

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const publicUrl = store ? `${protocol}://${host}/boutique/${store.slug}` : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShoppingBasket className="h-5 w-5 text-orange-500" />
          <h1 className="text-xl font-bold text-zinc-900">Boutique en ligne</h1>
        </div>
        <p className="text-sm text-zinc-500">
          Votre boutique qui ne ferme jamais : le même stock, les mêmes prix, ouverts 24h/24 sur un simple lien à
          partager.
        </p>
      </div>

      <OnlineStoreTabs active="partager" pendingCount={pendingOrders ?? 0} />

      {!store || !publicUrl ? (
        <EmptyState
          title="Configurez d'abord votre vitrine"
          description="Renseignez le nom et l'adresse de votre boutique dans « Ma vitrine » avant de pouvoir la partager."
          action={<ButtonLink href="/boutique-en-ligne">Aller dans Ma vitrine</ButtonLink>}
        />
      ) : !store.published ? (
        <EmptyState
          title="Votre boutique n'est pas encore en ligne"
          description='Activez « Mettre ma boutique en ligne » dans Ma vitrine pour que ce lien fonctionne pour vos clients.'
          action={<ButtonLink href="/boutique-en-ligne">Aller dans Ma vitrine</ButtonLink>}
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-zinc-900">Votre lien catalogue</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-sm text-zinc-500">
                Collez-le dans votre statut WhatsApp, votre page Facebook, vos cartes de visite.
              </p>
              <SharePanel publicUrl={publicUrl} storeName={store.storeName} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold text-zinc-900">Ce que voit votre client</h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-start gap-2.5 text-sm text-zinc-700">
                <Receipt className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                Vos articles réellement en stock dans cette boutique, avec leurs prix réels et vos promotions en
                cours.
              </div>
              <div className="flex items-start gap-2.5 text-sm text-zinc-700">
                <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                Un panier simple, sans compte à créer : nom, téléphone, adresse, c&apos;est tout.
              </div>
              <div className="flex items-start gap-2.5 text-sm text-zinc-700">
                <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                Un numéro de commande qu&apos;il peut vous transmettre pour que vous le retrouviez facilement.
              </div>
              <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-xs text-zinc-500">
                Vos prix d&apos;achat, vos marges et vos autres boutiques ne sont jamais visibles. Une commande reçue
                ici ne touche ni votre stock ni votre caisse tant que vous ne l&apos;avez pas traitée : vous
                confirmez, préparez, puis encaissez comme d&apos;habitude une fois la commande honorée.
              </p>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

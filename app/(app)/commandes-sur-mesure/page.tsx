import Link from "next/link";
import { redirect } from "next/navigation";
import { Scissors } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { ARTISAN_ACTIVITY_KEY } from "@/lib/nav";
import { getCustomOrdersAction, ensureCustomOrdersFlagRegistered, isCustomOrdersModuleEnabled, CUSTOM_ORDER_STATUS_LABELS } from "@/lib/actions/custom-orders";
import { formatMoney, formatDateTime, formatDate } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import type { CustomOrderStatus } from "@/lib/db-types";

const STATUS_TONE: Record<CustomOrderStatus, "zinc" | "blue" | "amber" | "emerald" | "red"> = {
  EN_COURS: "blue",
  PRET: "amber",
  LIVRE: "emerald",
  ANNULE: "red",
};

export default async function CustomOrdersPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const user = await requirePermission(PERMISSIONS.CUSTOM_ORDERS_MANAGE);
  if (user.business.activityKey !== ARTISAN_ACTIVITY_KEY) redirect("/dashboard");

  await ensureCustomOrdersFlagRegistered();
  if (!(await isCustomOrdersModuleEnabled(user.businessId))) redirect("/dashboard");

  const { statut } = await searchParams;
  const status = statut && statut in CUSTOM_ORDER_STATUS_LABELS ? (statut as CustomOrderStatus) : undefined;
  const orders = await getCustomOrdersAction(status ? { status } : undefined);
  const currency = user.business.currency;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Commandes sur mesure</h1>
            <p className="text-sm text-zinc-500">Pièces fabriquées à la demande, de la prise de commande à la livraison.</p>
          </div>
        </div>
        <ButtonLink href="/commandes-sur-mesure/nouveau">Nouvelle commande</ButtonLink>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/commandes-sur-mesure" className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${!status ? "bg-zindo-ink-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"}`}>
          Toutes
        </Link>
        {(Object.keys(CUSTOM_ORDER_STATUS_LABELS) as CustomOrderStatus[]).map((s) => (
          <Link
            key={s}
            href={`/commandes-sur-mesure?statut=${s}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${status === s ? "bg-zindo-ink-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"}`}
          >
            {CUSTOM_ORDER_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState title="Aucune commande sur mesure" description="Créez une commande dès qu'un client demande une pièce fabriquée sur mesure." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {orders.map((o) => (
            <Link key={o.id} href={`/commandes-sur-mesure/${o.id}`} className="block">
              <CardBody className="flex flex-wrap items-center justify-between gap-3 hover:bg-zinc-50">
                <div>
                  <p className="font-medium text-zinc-900">
                    {o.number} · {o.itemDescription}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {o.customer.name} · {formatDateTime(new Date(o.createdAt))}
                    {o.deliveryDate && <> · Livraison prévue le {formatDate(new Date(o.deliveryDate))}</>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <p className="font-semibold text-zinc-900">{formatMoney(o.total, currency)}</p>
                    {o.amountPaid < o.total && <p className="text-xs text-amber-600">Reste {formatMoney(o.total - o.amountPaid, currency)}</p>}
                  </div>
                  <Badge tone={STATUS_TONE[o.status]}>{CUSTOM_ORDER_STATUS_LABELS[o.status]}</Badge>
                </div>
              </CardBody>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}

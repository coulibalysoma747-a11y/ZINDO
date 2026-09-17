import { notFound } from "next/navigation";
import Link from "next/link";
import { Package2, MessageCircle } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getBusinessSettings } from "@/lib/business-settings";
import { getShipmentsAction } from "@/lib/actions/shipments";
import { formatMoney, formatDate } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Empty";
import { ShipmentStatusButtons } from "./ShipmentStatusButtons";

const STATUS_TONE = { ENVOYE: "amber", ARRIVE: "blue", RETIRE: "emerald" } as const;
const STATUS_LABELS = { ENVOYE: "Envoyé", ARRIVE: "Arrivé", RETIRE: "Retiré" } as const;

function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("226") ? digits : `226${digits}`;
}

export default async function ShipmentsPage() {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);
  const businessSettings = await getBusinessSettings(user.businessId);
  if (!businessSettings.modulesEnabled.shipments) notFound();

  const currency = user.business.currency;
  const shipments = await getShipmentsAction();
  const totalCost = shipments.reduce((s, sh) => s + sh.cost, 0);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package2 className="h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Expéditions</h1>
            <p className="text-sm text-zinc-500">Colis envoyés par transporteur pour une vente en gros à distance.</p>
          </div>
        </div>
        <ButtonLink href="/expeditions/nouveau">Nouvelle expédition</ButtonLink>
      </div>

      {totalCost > 0 && (
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">Total des frais de transport avancés</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{formatMoney(totalCost, currency)}</p>
          </CardBody>
        </Card>
      )}

      {shipments.length === 0 ? (
        <EmptyState title="Aucune expédition" description="Enregistrez votre premier colis envoyé." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {shipments.map((sh) => {
            const waHref = sh.recipientPhone
              ? `https://wa.me/${toWhatsAppNumber(sh.recipientPhone)}?text=${encodeURIComponent(
                  `Bonjour${sh.recipientName ? ` ${sh.recipientName}` : ""}, votre colis ${sh.number} (${sh.carrierName}${sh.waybillNumber ? `, bordereau ${sh.waybillNumber}` : ""}) est en route. Merci de confirmer sa réception.`
                )}`
              : null;
            return (
              <CardBody key={sh.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-zinc-900">
                    {sh.number} — {sh.carrierName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {sh.destination ?? "Destination non précisée"}
                    {sh.recipientName ? ` · ${sh.recipientName}` : ""}
                    {sh.sale && (
                      <>
                        {" · "}
                        <Link href={`/ventes/${sh.sale.id}`} className="text-emerald-600 hover:underline">
                          Facture {sh.sale.number}
                        </Link>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400">{formatDate(new Date(sh.createdAt))}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right text-sm">
                    <p className="font-semibold text-zinc-900">{formatMoney(sh.cost, currency)}</p>
                    <Badge tone={STATUS_TONE[sh.status]}>{STATUS_LABELS[sh.status]}</Badge>
                  </div>
                  <ShipmentStatusButtons shipmentId={sh.id} status={sh.status} />
                  {waHref && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Message de suivi WhatsApp"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </CardBody>
            );
          })}
        </Card>
      )}
    </div>
  );
}

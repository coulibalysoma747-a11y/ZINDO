import { notFound } from "next/navigation";
import { Send, MessageCircle } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getBusinessSettings } from "@/lib/business-settings";
import { getPickupsAction } from "@/lib/actions/pickups";
import { formatMoney, formatDate } from "@/lib/format";
import { toWhatsAppDigits } from "@/lib/countries";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { EmptyState } from "@/components/ui/Empty";
import { PickupPaymentButton } from "./PickupPaymentButton";

export default async function PickupsPage() {
  const user = await requirePermission(PERMISSIONS.STOCK_MANAGE);
  const businessSettings = await getBusinessSettings(user.businessId);
  if (!businessSettings.modulesEnabled.pickups) notFound();

  const currency = user.business.currency;
  const pickups = await getPickupsAction();
  const totalDue = pickups.reduce((s, p) => s + Math.max(0, p.total - p.amountPaid), 0);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Send className="h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Enlèvements partenaires</h1>
            <p className="text-sm text-zinc-500">
              Un confrère prend de la marchandise chez vous — n&apos;entre jamais dans votre chiffre d&apos;affaires.
            </p>
          </div>
        </div>
        <ButtonLink href="/enlevements/nouveau">Nouvel enlèvement</ButtonLink>
      </div>

      {totalDue > 0 && (
        <Card>
          <CardBody>
            <p className="text-sm text-zinc-500">Total dû par vos partenaires</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{formatMoney(totalDue, currency)}</p>
          </CardBody>
        </Card>
      )}

      {pickups.length === 0 ? (
        <EmptyState title="Aucun enlèvement" description="Enregistrez votre premier enlèvement partenaire." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {pickups.map((p) => {
            const remaining = Math.max(0, p.total - p.amountPaid);
            const waHref = p.partnerPhone
              ? `https://wa.me/${toWhatsAppDigits(p.partnerPhone, user.business.country)}?text=${encodeURIComponent(
                  `Bonjour ${p.partnerName}, petit rappel : il reste ${formatMoney(remaining, currency)} pour l'enlèvement ${p.number}. Merci !`
                )}`
              : null;
            return (
              <CardBody key={p.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ProductThumbnail photoUrl={p.product?.photoUrl} name={p.product?.name ?? "?"} size={40} />
                  <div>
                    <p className="font-medium text-zinc-900">{p.partnerName}</p>
                    <p className="text-xs text-zinc-500">
                      {p.number} · {p.product?.name ?? "Produit supprimé"} · {p.quantity} × {formatMoney(p.unitPrice, currency)}
                    </p>
                    <p className="text-xs text-zinc-400">{formatDate(new Date(p.createdAt))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right text-sm">
                    <p className="font-semibold text-zinc-900">{formatMoney(p.total, currency)}</p>
                    {remaining > 0 ? (
                      <Badge tone="red">{formatMoney(remaining, currency)} dû</Badge>
                    ) : (
                      <Badge tone="emerald">Réglé</Badge>
                    )}
                  </div>
                  {remaining > 0 && <PickupPaymentButton pickupId={p.id} remaining={remaining} />}
                  {remaining > 0 && waHref && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Rappel WhatsApp"
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

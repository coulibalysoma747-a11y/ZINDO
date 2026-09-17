import { CalendarClock } from "lucide-react";
import { getRentalsAction } from "@/lib/actions/rentals";
import { formatMoney, formatDate } from "@/lib/format";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { EmptyState } from "@/components/ui/Empty";
import { RentalActions } from "./RentalActions";

const STATUS_LABELS = { EN_COURS: "En cours", RETOURNEE: "Retournée", ANNULEE: "Annulée" } as const;

export default async function RentalsPage() {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);
  const currency = user.business.currency;
  const rentals = await getRentalsAction();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-zinc-500" />
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Location</h1>
            <p className="text-sm text-zinc-500">Matériel loué à vos clients, distinct de la vente.</p>
          </div>
        </div>
        <ButtonLink href="/location/nouveau">Nouvelle location</ButtonLink>
      </div>

      {rentals.length === 0 ? (
        <EmptyState title="Aucune location" description="Créez votre première location de matériel." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {rentals.map((r) => (
            <CardBody key={r.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ProductThumbnail photoUrl={r.product?.photoUrl} name={r.product?.name ?? "?"} size={44} />
                <div>
                  <p className="font-medium text-zinc-900">{r.product?.name ?? "Produit supprimé"}</p>
                  <p className="text-xs text-zinc-500">
                    {r.number} · Qté {r.quantity} · {r.customer?.name ?? "Sans client"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Du {formatDate(new Date(r.startDate))} au {formatDate(new Date(r.expectedReturnDate))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm">
                  <p className="font-semibold text-zinc-900">{formatMoney(r.dailyRate, currency)}/j</p>
                  {r.deposit > 0 && <p className="text-xs text-zinc-400">Caution {formatMoney(r.deposit, currency)}</p>}
                </div>
                <Badge tone={r.isLate ? "red" : r.status === "EN_COURS" ? "blue" : r.status === "RETOURNEE" ? "emerald" : "zinc"}>
                  {r.isLate ? "En retard" : STATUS_LABELS[r.status]}
                </Badge>
                {r.status === "EN_COURS" && <RentalActions rentalId={r.id} />}
              </div>
            </CardBody>
          ))}
        </Card>
      )}
    </div>
  );
}

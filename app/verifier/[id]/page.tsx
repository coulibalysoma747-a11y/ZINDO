import { XCircle, CheckCircle2, Ban } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDateTime } from "@/lib/format";
import { ZindoLogo } from "@/components/auth/ZindoLogo";

const PAYMENT_LABELS: Record<string, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
};

type SaleRow = {
  id: string;
  number: string;
  createdAt: string;
  status: string;
  total: number;
  amountPaid: number;
  paymentMethod: string;
  business: { name: string; currency: string };
  location: { name: string };
  items: Array<{ id: string }>;
};

export default async function VerifyTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data } = await supabase
    .from("sales")
    .select(
      "id, number, createdAt:created_at, status, total, amountPaid:amount_paid, paymentMethod:payment_method, business:businesses(name, currency), location:locations(name), items:sale_items(id)"
    )
    .eq("id", id)
    .maybeSingle();
  const sale = data as unknown as SaleRow | null;

  return (
    <div className="flex min-h-screen flex-col items-center bg-zindo-cream px-5 py-10 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <ZindoLogo size={48} />
        <p className="mt-3 text-sm font-semibold tracking-wide text-zindo-ink-900">
          Vérification de ticket ZINDO
        </p>
      </div>

      <div className="mt-8 w-full max-w-sm">
        {!sale ? (
          <div className="rounded-[24px] border border-red-100 bg-white p-6 text-center shadow-[0_20px_50px_-15px_rgba(13,19,48,0.15)]">
            <XCircle className="mx-auto h-10 w-10 text-red-500" />
            <p className="mt-3 font-bold text-zindo-ink-900">Ticket introuvable</p>
            <p className="mt-1.5 text-sm text-zinc-500">
              Ce code ne correspond à aucun ticket enregistré dans ZINDO. Il peut être invalide ou
              falsifié.
            </p>
          </div>
        ) : (
          <div className="rounded-[24px] border border-zindo-ink-900/5 bg-white p-6 shadow-[0_20px_50px_-15px_rgba(13,19,48,0.18)]">
            <div className="flex flex-col items-center text-center">
              {sale.status === "ANNULEE" ? (
                <>
                  <Ban className="h-10 w-10 text-zinc-400" />
                  <p className="mt-3 font-bold text-zinc-600">Vente annulée</p>
                  <p className="text-sm text-zinc-400">Ce ticket a été annulé après émission.</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-10 w-10 text-zindo-success-600" />
                  <p className="mt-3 font-bold text-zindo-ink-900">Ticket authentique</p>
                  <p className="text-sm text-zinc-500">Ce ticket est bien enregistré dans ZINDO.</p>
                </>
              )}
            </div>

            <div className="my-5 border-t border-dashed border-zinc-200" />

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Commerce</dt>
                <dd className="font-medium text-zindo-ink-900">{sale.business.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Boutique</dt>
                <dd className="font-medium text-zindo-ink-900">{sale.location.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">N° de ticket</dt>
                <dd className="font-mono font-medium text-zindo-ink-900">{sale.number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Date</dt>
                <dd className="font-medium text-zindo-ink-900">{formatDateTime(new Date(sale.createdAt))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Articles</dt>
                <dd className="font-medium text-zindo-ink-900">{sale.items.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Paiement</dt>
                <dd className="font-medium text-zindo-ink-900">
                  {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                </dd>
              </div>
            </dl>

            <div className="my-5 border-t border-dashed border-zinc-200" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-500">Total</span>
              <span className="text-lg font-bold text-zindo-ink-900">
                {formatMoney(sale.total, sale.business.currency)}
              </span>
            </div>

            {sale.status !== "ANNULEE" && sale.amountPaid < sale.total && (
              <>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-500">Versé</span>
                  <span className="font-semibold text-zindo-ink-900">
                    {formatMoney(sale.amountPaid, sale.business.currency)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-red-500">Reste à payer</span>
                  <span className="font-bold text-red-600">
                    {formatMoney(Math.max(0, sale.total - sale.amountPaid), sale.business.currency)}
                  </span>
                </div>
              </>
            )}
            {sale.status !== "ANNULEE" && sale.amountPaid >= sale.total && (
              <p className="mt-3 text-center text-sm font-medium text-zindo-success-600">Vente intégralement réglée</p>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-zinc-400">Vérification fournie par ZINDO</p>
    </div>
  );
}

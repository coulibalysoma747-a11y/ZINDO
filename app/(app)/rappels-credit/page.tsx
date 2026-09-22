import Link from "next/link";
import { BellRing, MessageCircle } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCreditRemindersAction } from "@/lib/actions/credit-reminders";
import { formatMoney, formatDate } from "@/lib/format";
import { toWhatsAppDigits } from "@/lib/countries";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Empty";

export default async function CreditRemindersPage() {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const currency = user.business.currency;
  const rows = await getCreditRemindersAction();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <BellRing className="h-5 w-5 text-zinc-500" />
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Rappels crédit</h1>
          <p className="text-sm text-zinc-500">Relancez vos clients qui doivent encore de l&apos;argent, en un clic.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucun rappel à envoyer" description="Tous les clients sont à jour sur leurs crédits." />
      ) : (
        <Card className="divide-y divide-zinc-100">
          {rows.map((r) => {
            const message = `Bonjour ${r.name}, ceci est un rappel amical de ${user.business.name} : vous avez un solde de ${formatMoney(r.amountDue, currency)} restant à régler. Merci de votre compréhension.`;
            const waHref = r.phone
              ? `https://wa.me/${toWhatsAppDigits(r.phone, user.business.country)}?text=${encodeURIComponent(message)}`
              : null;
            return (
              <CardBody key={r.customerId} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/clients/${r.customerId}`} className="font-medium text-zinc-900 hover:text-zindo-green-600">
                    {r.name}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {r.phone ?? "Pas de téléphone"} — depuis le {formatDate(new Date(r.since))}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-red-600">{formatMoney(r.amountDue, currency)}</span>
                  {waHref ? (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Rappel WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-400">Aucun numéro</span>
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

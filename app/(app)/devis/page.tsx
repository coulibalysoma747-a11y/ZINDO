import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { formatMoney, formatDateTime } from "@/lib/format";
import { ensureQuoteFlagRegistered, isQuoteModuleEnabled, listQuotesAction } from "@/lib/actions/quotes";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";

const STATUS_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  EXPIRE: "Expiré",
  CONVERTI: "Converti en vente",
};

const STATUS_TONE = {
  BROUILLON: "zinc",
  ENVOYE: "blue",
  ACCEPTE: "emerald",
  REFUSE: "red",
  EXPIRE: "amber",
  CONVERTI: "emerald",
} as const;

export default async function DevisPage() {
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

  const quotes = await listQuotesAction();
  const currency = user.business.currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Devis</h1>
          <p className="text-sm text-zinc-500">Préparez un devis, puis convertissez-le en vente une fois accepté par le client.</p>
        </div>
        <ButtonLink href="/devis/nouveau">Nouveau devis</ButtonLink>
      </div>

      {quotes.length === 0 ? (
        <EmptyState
          title="Aucun devis pour le moment"
          description="Créez votre premier devis pour un client."
          action={<ButtonLink href="/devis/nouveau">Nouveau devis</ButtonLink>}
        />
      ) : (
        <>
          <Card className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">N°</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link href={`/devis/${q.id}`} className="font-mono text-xs text-emerald-600 hover:underline">
                        {q.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{formatDateTime(new Date(q.createdAt))}</td>
                    <td className="px-4 py-3 text-zinc-600">{q.customerLabel}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[q.status as keyof typeof STATUS_TONE] ?? "zinc"}>
                        {STATUS_LABELS[q.status] ?? q.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">{formatMoney(q.total, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="space-y-2 sm:hidden">
            {quotes.map((q) => (
              <Link key={q.id} href={`/devis/${q.id}`}>
                <Card className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs text-emerald-600">{q.number}</span>
                    <Badge tone={STATUS_TONE[q.status as keyof typeof STATUS_TONE] ?? "zinc"}>
                      {STATUS_LABELS[q.status] ?? q.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-700">{q.customerLabel}</p>
                  <p className="text-xs text-zinc-500">{formatDateTime(new Date(q.createdAt))}</p>
                  <p className="mt-2 text-right font-semibold text-zinc-900">{formatMoney(q.total, currency)}</p>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

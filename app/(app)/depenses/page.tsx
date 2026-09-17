import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getCurrentLocation } from "@/lib/location";
import { formatMoney, formatDateTime, startOfToday, startOfYesterday, startOfWeek, startOfMonth } from "@/lib/format";
import { getBusinessSettings } from "@/lib/business-settings";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { ButtonLink } from "@/components/ui/Button";
import { HistoryFilters } from "@/components/history/HistoryFilters";
import { ExpenseManager } from "./ExpenseManager";
import { DeleteExpenseButton } from "./DeleteExpenseButton";

const PAYMENT_LABELS: Record<string, string> = { ESPECES: "Espèces", MOBILE_MONEY: "Mobile Money" };

type ExpenseRow = {
  id: string;
  date: string;
  label: string;
  note: string | null;
  category: string | null;
  paymentMethod: string;
  amount: number;
  user: { firstName: string; lastName: string };
};

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.EXPENSES_MANAGE);
  const { periode } = await searchParams;
  const [currentLocation, businessSettings] = await Promise.all([
    getCurrentLocation(user.businessId),
    getBusinessSettings(user.businessId),
  ]);

  if (!currentLocation) {
    return (
      <EmptyState
        title="Aucune boutique configurée"
        description="Créez une boutique avant d'enregistrer des dépenses."
        action={<ButtonLink href="/boutiques">Configurer une boutique</ButtonLink>}
      />
    );
  }

  let query = supabase
    .from("expenses")
    .select(
      "id, date, label, note, category, paymentMethod:payment_method, amount, user:users(firstName:first_name, lastName:last_name)"
    )
    .eq("business_id", user.businessId)
    .eq("location_id", currentLocation.id)
    .order("date", { ascending: false })
    .limit(200);

  if (periode === "aujourdhui") query = query.gte("date", startOfToday().toISOString());
  else if (periode === "hier")
    query = query.gte("date", startOfYesterday().toISOString()).lt("date", startOfToday().toISOString());
  else if (periode === "semaine") query = query.gte("date", startOfWeek().toISOString());
  else if (periode === "mois") query = query.gte("date", startOfMonth().toISOString());

  const { data } = await query;
  const expenses = (data ?? []) as unknown as ExpenseRow[];

  const currency = user.business.currency;
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Dépenses</h1>
          <p className="text-sm text-zinc-500">{currentLocation.name}</p>
        </div>
        <ExpenseManager categories={businessSettings.expenseCategories} />
      </div>

      <Card>
        <CardBody>
          <p className="text-sm text-zinc-500">Total des dépenses sur la période</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{formatMoney(total, currency)}</p>
        </CardBody>
      </Card>

      <HistoryFilters paramName="periode" />

      {expenses.length === 0 ? (
        <EmptyState title="Aucune dépense sur cette période" description="Enregistrez votre première dépense." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Libellé</th>
                <th className="px-4 py-3 font-medium">Catégorie</th>
                <th className="px-4 py-3 font-medium">Règlement</th>
                <th className="px-4 py-3 font-medium">Enregistré par</th>
                <th className="px-4 py-3 text-right font-medium">Montant</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-zinc-600">{formatDateTime(new Date(e.date))}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{e.label}</p>
                    {e.note && <p className="text-xs text-zinc-400">{e.note}</p>}
                  </td>
                  <td className="px-4 py-3">{e.category ? <Badge tone="zinc">{e.category}</Badge> : "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{PAYMENT_LABELS[e.paymentMethod] ?? e.paymentMethod}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {e.user.firstName} {e.user.lastName}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">{formatMoney(e.amount, currency)}</td>
                  <td className="px-4 py-3 text-right">
                    <DeleteExpenseButton id={e.id} label={e.label} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

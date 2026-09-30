import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatDate, formatMoney } from "@/lib/format";
import { toWhatsAppDigits } from "@/lib/countries";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { MessageCircle, Search } from "lucide-react";
import { getActivityConfig, resolveTerm } from "@/lib/activity-config";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { ClientManager } from "./ClientManager";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  sales: Array<{ total: number; amountPaid: number; status: string; createdAt: string }>;
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; filtre?: string }> }) {
  const { q = "", filtre = "" } = await searchParams;
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const [canManage, canSeeSales, activityConfig, pro] = await Promise.all([
    hasPermission(user.businessId, user.role, PERMISSIONS.CUSTOMERS_MANAGE, user.id),
    hasPermission(user.businessId, user.role, PERMISSIONS.SALES_CREATE, user.id),
    getActivityConfig(user.business.activityKey),
    isFeatureEnabled("interface_pro", user.businessId),
  ]);
  const clientsLabel = resolveTerm(activityConfig, "clients");

  const { data } = await supabase
    .from("customers")
    .select("id, name, phone, sales(total, amountPaid:amount_paid, status, createdAt:created_at)")
    .eq("business_id", user.businessId)
    .order("name", { ascending: true });
  const customers = (data ?? []) as unknown as CustomerRow[];

  const currency = user.business.currency;

  if (pro) {
    const rows = customers.map((c) => {
      const active = c.sales.filter((sale) => sale.status !== "ANNULEE");
      return {
        ...c,
        totalBought: active.reduce((sum, sale) => sum + sale.total, 0),
        credit: active.reduce((sum, sale) => sum + Math.max(0, sale.total - sale.amountPaid), 0),
        lastPurchase: active.reduce<string | null>((last, sale) => (!last || sale.createdAt > last ? sale.createdAt : last), null),
      };
    });
    const withCredit = rows.filter((r) => r.credit > 0);
    const totalCredit = withCredit.reduce((sum, r) => sum + r.credit, 0);
    const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const term = norm(q.trim());
    const visible = rows.filter(
      (r) => (filtre !== "credit" || r.credit > 0) && (!term || norm(r.name).includes(term) || (r.phone ?? "").replace(/\s/g, "").includes(term.replace(/\s/g, "")))
    );
    const link = (f: string) => {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (f) p.set("filtre", f);
      const qs = p.toString();
      return qs ? `/clients?${qs}` : "/clients";
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{clientsLabel}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {customers.length} {clientsLabel.toLowerCase()}
              {totalCredit > 0 && (
                <>
                  {" "}· <span className="font-medium text-red-600">{formatMoney(totalCredit, currency)}</span> de crédits à encaisser
                </>
              )}
            </p>
          </div>
          {canManage && <ClientManager />}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form className="relative flex-1" action="">
            {filtre && <input type="hidden" name="filtre" value={filtre} />}
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Rechercher par nom ou téléphone…"
              className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-zindo-green-500 focus:ring-4 focus:ring-zindo-green-500/15 dark:border-slate-700 dark:bg-slate-900"
            />
          </form>
          <div className="flex gap-2">
            <Link href={link("")} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${filtre !== "credit" ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700"}`}>
              Tous <span className="tabular-nums opacity-80">{rows.length}</span>
            </Link>
            <Link href={link("credit")} className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ${filtre === "credit" ? "bg-red-600 text-white" : "border border-red-200 bg-red-50 text-red-700"}`}>
              Avec crédit <span className="tabular-nums opacity-80">{withCredit.length}</span>
            </Link>
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState title="Aucun client trouvé" description={customers.length === 0 ? "Ajoutez votre premier client." : "Modifiez la recherche ou le filtre."} />
        ) : (
          <Card className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHead>
                <TableRow interactive={false}>
                  <TableHeaderCell>Client</TableHeaderCell>
                  <TableHeaderCell>Dernier achat</TableHeaderCell>
                  {canSeeSales && <TableHeaderCell align="right">Total acheté</TableHeaderCell>}
                  <TableHeaderCell align="right">Crédit</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((c) => {
                  const wa = c.phone ? toWhatsAppDigits(c.phone, user.business.country) : "";
                  const message = `Bonjour ${c.name}, c'est ${user.business.name}. Il reste ${formatMoney(c.credit, currency)} à régler sur vos achats. Merci et à bientôt !`;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zindo-green-50 text-sm font-semibold text-zindo-green-800 dark:bg-zindo-green-500/15 dark:text-zindo-green-300">
                            {c.name.trim().slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <Link href={`/clients/${c.id}`} className="font-medium text-zinc-900 hover:text-zindo-green-700 dark:text-slate-100">
                              {c.name}
                            </Link>
                            <p className="text-xs text-zinc-500">{c.phone ?? "Pas de téléphone"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-zinc-600 dark:text-slate-400">{c.lastPurchase ? formatDate(c.lastPurchase) : "—"}</TableCell>
                      {canSeeSales && (
                        <TableCell align="right" className="tabular-nums text-zinc-900 dark:text-slate-100">
                          {formatMoney(c.totalBought, currency)}
                        </TableCell>
                      )}
                      <TableCell align="right" className="tabular-nums">
                        {c.credit > 0 ? <Badge tone="red">{formatMoney(c.credit, currency)}</Badge> : <span className="text-zinc-400">—</span>}
                      </TableCell>
                      <TableCell align="right">
                        {c.credit > 0 && wa && (
                          <a
                            href={`https://wa.me/${wa}?text=${encodeURIComponent(message)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:border-[#25D366] hover:text-[#128C7E] dark:border-slate-700 dark:text-slate-300"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> Relancer
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{clientsLabel}</h1>
          <p className="text-sm text-zinc-500">
            {customers.length} {clientsLabel.toLowerCase()}
          </p>
        </div>
        {canManage && <ClientManager />}
      </div>

      {customers.length === 0 ? (
        <EmptyState title="Aucun client" description="Ajoutez votre premier client." />
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>Nom</TableHeaderCell>
                <TableHeaderCell>Téléphone</TableHeaderCell>
                {canSeeSales && <TableHeaderCell align="right">Total acheté</TableHeaderCell>}
                <TableHeaderCell align="right">Crédit</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((c) => {
                const activeSales = c.sales.filter((s) => s.status !== "ANNULEE");
                const totalBought = activeSales.reduce((s, sale) => s + sale.total, 0);
                const credit = activeSales.reduce((s, sale) => s + Math.max(0, sale.total - sale.amountPaid), 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/clients/${c.id}`} className="font-medium text-zinc-900 hover:text-emerald-600 dark:text-slate-100">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-zinc-600 dark:text-slate-400">{c.phone ?? "—"}</TableCell>
                    {canSeeSales && (
                      <TableCell align="right" className="text-zinc-900 tabular-nums dark:text-slate-100">
                        {formatMoney(totalBought, currency)}
                      </TableCell>
                    )}
                    <TableCell align="right" className="tabular-nums">
                      {credit > 0 ? (
                        <Badge tone="red">{formatMoney(credit, currency)}</Badge>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

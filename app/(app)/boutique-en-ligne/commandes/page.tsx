import Link from "next/link";
import { Truck } from "lucide-react";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { formatMoney, formatDateTime } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Empty";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/Table";
import { OnlineStoreTabs } from "../OnlineStoreTabs";
import { OrderStatusControls } from "./OrderStatusControls";

const STATUS_TONE = {
  EN_ATTENTE: "amber",
  CONFIRMEE: "blue",
  PRETE: "emerald",
  LIVREE: "emerald",
  ANNULEE: "zinc",
} as const;

const STATUS_LABELS = {
  EN_ATTENTE: "À traiter",
  CONFIRMEE: "Confirmée",
  PRETE: "Prête",
  LIVREE: "Encaissée",
  ANNULEE: "Annulée",
} as const;

const STATUS_FILTERS = [
  { value: "", label: "Toutes" },
  { value: "EN_ATTENTE", label: "À traiter" },
  { value: "CONFIRMEE", label: "Confirmées" },
  { value: "PRETE", label: "Prêtes" },
  { value: "LIVREE", label: "Encaissées" },
  { value: "ANNULEE", label: "Annulées" },
] as const;

type OrderRow = {
  id: string;
  number: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  wantsDelivery: boolean;
  deliveryAddress: string | null;
  note: string | null;
  status: keyof typeof STATUS_LABELS;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: Array<{ id: string; quantity: number; unitPrice: number; total: number; product: { name: string } }>;
};

export default async function OnlineOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);
  const { statut } = await searchParams;

  const { data: store } = await supabase
    .from("online_stores")
    .select("id")
    .eq("business_id", user.businessId)
    .maybeSingle();

  const { data } = store
    ? await supabase
        .from("online_orders")
        .select(
          "id, number, customerName:customer_name, customerPhone:customer_phone, createdAt:created_at, wantsDelivery:wants_delivery, deliveryAddress:delivery_address, note, status, subtotal, deliveryFee:delivery_fee, total, " +
            "items:online_order_items(id, quantity, unitPrice:unit_price, total, product:products(name))"
        )
        .eq("store_id", store.id)
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: [] as unknown[] };
  const allOrders = (data ?? []) as unknown as OrderRow[];
  const { count: pendingOrders } = store
    ? await supabase
        .from("online_orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", store.id)
        .eq("status", "EN_ATTENTE")
    : { count: 0 };

  const orders = statut ? allOrders.filter((o) => o.status === statut) : allOrders;

  const currency = user.business.currency;
  const sorted = [...orders].sort((a, b) => {
    if (a.status === "EN_ATTENTE" && b.status !== "EN_ATTENTE") return -1;
    if (a.status !== "EN_ATTENTE" && b.status === "EN_ATTENTE") return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Boutique en ligne</h1>
        <p className="text-sm text-zinc-500">
          {allOrders.length} commande(s) reçue(s)
          {statut ? ` — ${orders.length} affichée(s)` : ""}
        </p>
      </div>

      <OnlineStoreTabs active="commandes" pendingCount={pendingOrders ?? 0} />

      <div className="flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white p-1">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/boutique-en-ligne/commandes?statut=${f.value}` : "/boutique-en-ligne/commandes"}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              (statut ?? "") === f.value ? "bg-orange-500 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          title="Aucune commande ici"
          description="Partagez votre lien catalogue sur WhatsApp ou Facebook : les commandes de vos clients arriveront directement dans cet écran."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((order) => (
            <Card key={order.id}>
              <CardBody className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-900">
                      {order.number} — {order.customerName}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {order.customerPhone} — {formatDateTime(new Date(order.createdAt))}
                    </p>
                    {order.wantsDelivery && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                        <Truck className="h-3 w-3" /> Livraison : {order.deliveryAddress}
                      </p>
                    )}
                    {order.note && <p className="mt-0.5 text-xs italic text-zinc-400">« {order.note} »</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABELS[order.status]}</Badge>
                    <OrderStatusControls orderId={order.id} status={order.status} />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table className="min-w-[320px]">
                    <TableBody>
                      {order.items.map((item) => (
                        <TableRow key={item.id} interactive={false}>
                          <TableCell className="px-0 py-1 text-zinc-700 dark:text-slate-300">{item.product.name}</TableCell>
                          <TableCell align="right" className="px-0 py-1 tabular-nums text-zinc-500 dark:text-slate-400">
                            {item.quantity} × {formatMoney(item.unitPrice, currency)}
                          </TableCell>
                          <TableCell align="right" className="px-0 py-1 font-medium tabular-nums text-zinc-900 dark:text-slate-100">
                            {formatMoney(item.total, currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end gap-4 border-t border-zinc-100 pt-2 text-sm">
                  <span className="text-zinc-500">Sous-total {formatMoney(order.subtotal, currency)}</span>
                  {order.deliveryFee > 0 && (
                    <span className="text-zinc-500">Livraison {formatMoney(order.deliveryFee, currency)}</span>
                  )}
                  <span className="font-bold text-zinc-900">Total {formatMoney(order.total, currency)}</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

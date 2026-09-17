"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

export type CreditReminderRow = {
  customerId: string;
  name: string;
  phone: string | null;
  amountDue: number;
  since: string;
};

type SaleRow = {
  createdAt: string;
  total: number;
  amountPaid: number;
  customer: { id: string; name: string; phone: string | null } | null;
};

/** Crédits clients en cours, agrégés par client — même source que /credits, réutilisée pour les relances. */
export async function getCreditRemindersAction(): Promise<CreditReminderRow[]> {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);

  const { data } = await supabase
    .from("sales")
    .select("createdAt:created_at, total, amountPaid:amount_paid, customer:customers(id, name, phone)")
    .eq("business_id", user.businessId)
    .in("status", ["CREDIT", "PARTIELLE"])
    .order("created_at", { ascending: true });

  const byCustomer = new Map<string, CreditReminderRow>();
  for (const sale of (data ?? []) as unknown as SaleRow[]) {
    if (!sale.customer) continue;
    const remaining = sale.total - sale.amountPaid;
    if (remaining <= 0) continue;
    const existing = byCustomer.get(sale.customer.id);
    if (existing) {
      existing.amountDue += remaining;
    } else {
      byCustomer.set(sale.customer.id, {
        customerId: sale.customer.id,
        name: sale.customer.name,
        phone: sale.customer.phone,
        amountDue: remaining,
        since: sale.createdAt,
      });
    }
  }

  return Array.from(byCustomer.values()).sort((a, b) => b.amountDue - a.amountDue);
}

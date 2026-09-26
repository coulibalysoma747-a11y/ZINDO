import "server-only";
import { supabase } from "@/lib/supabase";

/**
 * Opérations de l'historique global (ventes, achats, entrées/sorties,
 * remboursements, paiements fournisseurs), partagées entre l'écran
 * Historique et son journal PDF (flag « pdf_journal »).
 */
export type HistoryRow = {
  date: Date;
  type: "Vente" | "Achat" | "Entrée" | "Sortie" | "Crédit remboursé" | "Paiement fournisseur";
  description: string;
  location: string;
  amount: number;
  user: string;
  tone: "emerald" | "red" | "amber" | "blue" | "zinc";
};

export const TYPE_TO_FILTER: Record<string, HistoryRow["type"][]> = {
  ventes: ["Vente"],
  achats: ["Achat"],
  entrees: ["Entrée"],
  sorties: ["Sortie"],
  credits: ["Crédit remboursé"],
  paiements: ["Crédit remboursé", "Paiement fournisseur"],
};

function applyDateFilter<T>(query: T, dateFrom: Date | undefined, dateTo: Date | undefined, column = "created_at") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = query as any;
  if (dateFrom) q = q.gte(column, dateFrom.toISOString());
  if (dateTo) q = q.lt(column, dateTo.toISOString());
  return q;
}


const REASON_LABELS: Record<string, string> = {
  RETOUR_CLIENT: "retour client",
  CORRECTION: "correction",
  INVENTAIRE: "inventaire",
  PRODUIT_ENDOMMAGE: "produit endommagé",
  PERTE: "perte",
  RETOUR_FOURNISSEUR: "retour fournisseur",
  TRANSFERT: "transfert",
  AUTRE: "autre",
  ENLEVEMENT: "enlèvement partenaire",
};

export async function loadGlobalHistory(
  businessId: string,
  {
    dateFrom,
    dateTo,
    type,
    limitPerSource = 150,
    maxRows = 200,
    readableReasons = false,
  }: {
    dateFrom?: Date;
    dateTo?: Date;
    type?: string;
    limitPerSource?: number;
    maxRows?: number;
    /** Motifs des mouvements en toutes lettres (« perte ») plutôt que le code (« PERTE »). */
    readableReasons?: boolean;
  }
): Promise<{ rows: HistoryRow[]; truncated: boolean }> {
  const [salesRes, purchasesRes, movementsRes, customerPaymentsRes, supplierPaymentsRes] = await Promise.all([
    applyDateFilter(
      supabase
        .from("sales")
        .select("createdAt:created_at, number, total, location:locations(name), customer:customers(name), user:users(firstName:first_name, lastName:last_name)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(limitPerSource),
      dateFrom,
      dateTo
    ),
    applyDateFilter(
      supabase
        .from("purchases")
        .select("createdAt:created_at, number, total, location:locations(name), supplier:suppliers(name), user:users(firstName:first_name, lastName:last_name)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(limitPerSource),
      dateFrom,
      dateTo
    ),
    applyDateFilter(
      supabase
        .from("stock_movements")
        .select("createdAt:created_at, direction, reason, quantity, product:products(name), location:locations(name), user:users(firstName:first_name, lastName:last_name)")
        .eq("business_id", businessId)
        .not("reason", "in", "(VENTE,ACHAT)")
        .order("created_at", { ascending: false })
        .limit(limitPerSource),
      dateFrom,
      dateTo
    ),
    applyDateFilter(
      supabase
        .from("customer_payments")
        .select("createdAt:created_at, amount, customer:customers!inner(name, businessId:business_id), user:users(firstName:first_name, lastName:last_name)")
        .eq("customers.business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(limitPerSource),
      dateFrom,
      dateTo
    ),
    applyDateFilter(
      supabase
        .from("supplier_payments")
        .select("createdAt:created_at, amount, supplier:suppliers!inner(name, businessId:business_id), user:users(firstName:first_name, lastName:last_name)")
        .eq("suppliers.business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(limitPerSource),
      dateFrom,
      dateTo
    ),
  ]);

  const sales = (salesRes.data ?? []) as unknown as Array<{
    createdAt: string;
    number: string;
    total: number;
    location: { name: string };
    customer: { name: string } | null;
    user: { firstName: string; lastName: string };
  }>;
  const purchases = (purchasesRes.data ?? []) as unknown as Array<{
    createdAt: string;
    number: string;
    total: number;
    location: { name: string };
    supplier: { name: string };
    user: { firstName: string; lastName: string };
  }>;
  const movements = (movementsRes.data ?? []) as unknown as Array<{
    createdAt: string;
    direction: string;
    reason: string;
    quantity: number;
    product: { name: string };
    location: { name: string };
    user: { firstName: string; lastName: string };
  }>;
  const customerPayments = (customerPaymentsRes.data ?? []) as unknown as Array<{
    createdAt: string;
    amount: number;
    customer: { name: string };
    user: { firstName: string; lastName: string };
  }>;
  const supplierPayments = (supplierPaymentsRes.data ?? []) as unknown as Array<{
    createdAt: string;
    amount: number;
    supplier: { name: string };
    user: { firstName: string; lastName: string };
  }>;

  const all: HistoryRow[] = [
    ...sales.map(
      (s): HistoryRow => ({
        date: new Date(s.createdAt),
        type: "Vente",
        description: `${s.number} — ${s.customer?.name ?? "Client de passage"}`,
        location: s.location.name,
        amount: s.total,
        user: `${s.user.firstName} ${s.user.lastName}`,
        tone: "emerald",
      })
    ),
    ...purchases.map(
      (p): HistoryRow => ({
        date: new Date(p.createdAt),
        type: "Achat",
        description: `${p.number} — ${p.supplier.name}`,
        location: p.location.name,
        amount: p.total,
        user: `${p.user.firstName} ${p.user.lastName}`,
        tone: "blue",
      })
    ),
    ...movements.map(
      (m): HistoryRow => ({
        date: new Date(m.createdAt),
        type: m.direction === "IN" ? "Entrée" : "Sortie",
        description: `${m.product.name} (${readableReasons ? (REASON_LABELS[m.reason] ?? m.reason) : m.reason})`,
        location: m.location.name,
        amount: m.quantity,
        user: `${m.user.firstName} ${m.user.lastName}`,
        tone: m.direction === "IN" ? "emerald" : "red",
      })
    ),
    ...customerPayments.map(
      (p): HistoryRow => ({
        date: new Date(p.createdAt),
        type: "Crédit remboursé",
        description: p.customer.name,
        location: "—",
        amount: p.amount,
        user: `${p.user.firstName} ${p.user.lastName}`,
        tone: "amber",
      })
    ),
    ...supplierPayments.map(
      (p): HistoryRow => ({
        date: new Date(p.createdAt),
        type: "Paiement fournisseur",
        description: p.supplier.name,
        location: "—",
        amount: p.amount,
        user: `${p.user.firstName} ${p.user.lastName}`,
        tone: "zinc",
      })
    ),
  ]
    .filter((r) => !type || TYPE_TO_FILTER[type]?.includes(r.type))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  // Une source qui atteint sa limite peut cacher des opérations plus anciennes.
  const sourceFull = [sales, purchases, movements, customerPayments, supplierPayments].some((l) => l.length >= limitPerSource);
  return { rows: all.slice(0, maxRows), truncated: sourceFull || all.length > maxRows };
}


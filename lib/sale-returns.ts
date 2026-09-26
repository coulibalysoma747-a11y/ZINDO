import "server-only";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

const SALE_RETURN_FLAG = "retour_partiel";

export async function isSaleReturnEnabled(businessId: string): Promise<boolean> {
  await registerFeatureFlag(
    SALE_RETURN_FLAG,
    "Retour / échange d'articles",
    "Reprendre une partie des articles d'une vente : stock réintégré, client remboursé ou dette réduite, avec un bon de retour lié à la vente d'origine."
  );
  return isFeatureEnabled(SALE_RETURN_FLAG, businessId);
}

export type ReturnableLine = {
  /** Clé produit + conditionnement : deux lignes du même article se cumulent. */
  key: string;
  productId: string;
  packagingUnitId: string | null;
  name: string;
  unitLabel: string | null;
  multiplier: number;
  soldQty: number;
  returnedQty: number;
  /** Prix net d'une unité vendue (remise de ligne et remise globale déduites). */
  unitRefund: number;
  unitPrice: number;
  unitCost: number;
};

export type SaleReturnInfo = {
  sale: {
    id: string;
    number: string;
    status: string;
    customerId: string | null;
    locationId: string;
    total: number;
    amountPaid: number;
    paymentMethod: string;
    documentType: string;
    returnOfSaleId: string | null;
  };
  /** Vente d'origine quand cette vente est elle-même un retour. */
  original: { id: string; number: string } | null;
  returns: { id: string; number: string; total: number; createdAt: string; status: string }[];
  lines: ReturnableLine[];
  /** Vente d'engins (exemplaires suivis) : passer par l'annulation. */
  hasVehicleUnits: boolean;
  /** Reste dû par le client sur la vente d'origine. */
  remainingDebt: number;
};

/**
 * Liens retour ↔ vente d'origine, tolérant l'absence de la colonne
 * return_of_sale_id (migration pas encore appliquée : aucun retour possible).
 */
export async function getReturnLinks(saleId: string): Promise<{ returnOfSaleId: string | null; activeReturns: number }> {
  const [{ data: self, error }, { count }] = await Promise.all([
    supabase.from("sales").select("returnOfSaleId:return_of_sale_id").eq("id", saleId).maybeSingle(),
    supabase.from("sales").select("id", { count: "exact", head: true }).eq("return_of_sale_id", saleId).neq("status", "ANNULEE"),
  ]);
  if (error) return { returnOfSaleId: null, activeReturns: 0 };
  return { returnOfSaleId: (self?.returnOfSaleId as string | null) ?? null, activeReturns: count ?? 0 };
}

export const lineKey =(productId: string, packagingUnitId: string | null) => `${productId}:${packagingUnitId ?? ""}`;

/**
 * Tout ce qu'il faut pour proposer (ou refuser) un retour sur une vente :
 * quantités vendues, déjà rendues, et prix net remboursable par unité.
 * `null` si la vente n'existe pas dans ce commerce, ou si la colonne
 * return_of_sale_id n'est pas encore migrée.
 */
export async function getSaleReturnInfo(saleId: string, businessId: string): Promise<SaleReturnInfo | null> {
  const { data: sale, error } = await supabase
    .from("sales")
    .select(
      "id, number, status, customerId:customer_id, locationId:location_id, subtotal, total, amountPaid:amount_paid, paymentMethod:payment_method, documentType:document_type, returnOfSaleId:return_of_sale_id"
    )
    .eq("id", saleId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error || !sale) {
    if (error) console.error("[getSaleReturnInfo]", error.message);
    return null;
  }

  const [{ data: original }, { data: returns }, { data: items }, { count: vehicleCount }] = await Promise.all([
    sale.returnOfSaleId
      ? supabase.from("sales").select("id, number").eq("id", sale.returnOfSaleId).eq("business_id", businessId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("sales")
      .select("id, number, total, createdAt:created_at, status, items:sale_items(productId:product_id, packagingUnitId:packaging_unit_id, quantity)")
      .eq("business_id", businessId)
      .eq("return_of_sale_id", sale.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("sale_items")
      .select(
        "productId:product_id, packagingUnitId:packaging_unit_id, quantity, unitPrice:unit_price, unitCost:unit_cost, total, multiplier, unitLabel:unit_label, product:products(name)"
      )
      .eq("sale_id", sale.id),
    supabase.from("vehicle_units").select("id", { count: "exact", head: true }).eq("sale_id", sale.id),
  ]);

  const returnRows = (returns ?? []) as unknown as Array<{
    id: string;
    number: string;
    total: number;
    createdAt: string;
    status: string;
    items: Array<{ productId: string; packagingUnitId: string | null; quantity: number }>;
  }>;
  const returned = new Map<string, number>();
  for (const r of returnRows) {
    if (r.status === "ANNULEE") continue;
    for (const it of r.items) {
      const k = lineKey(it.productId, it.packagingUnitId);
      returned.set(k, (returned.get(k) ?? 0) + Math.abs(Number(it.quantity)));
    }
  }

  // Remise globale répartie au prorata : le client récupère ce qu'il a
  // réellement payé pour l'article, pas le prix catalogue.
  const subtotal = Number(sale.subtotal);
  const ratio = subtotal > 0 ? Number(sale.total) / subtotal : 1;

  const byKey = new Map<string, ReturnableLine>();
  for (const it of (items ?? []) as unknown as Array<{
    productId: string;
    packagingUnitId: string | null;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    total: number;
    multiplier: number | null;
    unitLabel: string | null;
    product: { name: string } | null;
  }>) {
    const qty = Number(it.quantity);
    if (qty <= 0) continue;
    const k = lineKey(it.productId, it.packagingUnitId);
    const existing = byKey.get(k);
    if (existing) {
      const totalNet = existing.unitRefund * existing.soldQty + Number(it.total) * ratio;
      existing.soldQty += qty;
      existing.unitRefund = totalNet / existing.soldQty;
      continue;
    }
    byKey.set(k, {
      key: k,
      productId: it.productId,
      packagingUnitId: it.packagingUnitId,
      name: it.product?.name ?? "Article",
      unitLabel: it.unitLabel,
      multiplier: Number(it.multiplier ?? 1),
      soldQty: qty,
      returnedQty: 0,
      unitRefund: (Number(it.total) * ratio) / qty,
      unitPrice: Number(it.unitPrice),
      unitCost: Number(it.unitCost),
    });
  }
  for (const line of byKey.values()) line.returnedQty = returned.get(line.key) ?? 0;

  return {
    sale: {
      id: sale.id as string,
      number: sale.number as string,
      status: sale.status as string,
      customerId: (sale.customerId as string | null) ?? null,
      locationId: sale.locationId as string,
      total: Number(sale.total),
      amountPaid: Number(sale.amountPaid),
      paymentMethod: sale.paymentMethod as string,
      documentType: sale.documentType as string,
      returnOfSaleId: (sale.returnOfSaleId as string | null) ?? null,
    },
    original: (original as { id: string; number: string } | null) ?? null,
    returns: returnRows.map(({ id, number, total, createdAt, status }) => ({ id, number, total: Number(total), createdAt, status })),
    lines: Array.from(byKey.values()),
    hasVehicleUnits: (vehicleCount ?? 0) > 0,
    remainingDebt: Math.max(0, Number(sale.total) - Number(sale.amountPaid)),
  };
}

import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { supabase } from "@/lib/supabase";
import { getInvoiceCustomization, type InvoiceCustomization } from "@/lib/invoice-customization";
import { generateQrDataUrl } from "@/lib/qrcode";
import { ensureReferralCode, isReferralModuleEnabled, referralUrl, ZINDO_SITE } from "@/lib/referral";
import { isConfirmedOrder, type PurchaseOrderStatus } from "@/lib/purchase-orders";

export type DocOrder = {
  id: string;
  number: string;
  status: PurchaseOrderStatus;
  transportCost: number | null;
  discount: number;
  responseBy: string | null;
  expectedDeliveryDate: string | null;
  deliveryPlace: string | null;
  paymentTerms: string | null;
  deposit: number;
  note: string | null;
  groupNumber: string;
  createdAt: string;
  confirmedAt: string | null;
  supplier: { name: string; company: string | null; phone: string | null; address: string | null };
  location: { name: string; city: string | null };
  items: {
    quantity: number;
    unitPrice: number | null;
    position: number;
    product: { name: string; reference: string; unit: string; unitsPerCarton: number | null };
  }[];
};

export type PurchaseOrderDocumentData = {
  order: DocOrder;
  business: { name: string; logoUrl: string | null; address: string | null; city: string | null; phone: string | null; currency: string };
  custom: InvoiceCustomization;
  qrDataUrl: string;
};

const ORDER_SELECT =
  "id, number, status, transportCost:transport_cost, discount, responseBy:response_by, expectedDeliveryDate:expected_delivery_date, deliveryPlace:delivery_place, paymentTerms:payment_terms, deposit, note, groupNumber:group_number, createdAt:created_at, confirmedAt:confirmed_at, supplier:suppliers(name, company, phone, address), location:locations(name, city), items:purchase_order_items(quantity, unitPrice:unit_price, position, product:products(name, reference, unit, unitsPerCarton:units_per_carton))";

/** Données du document ; businessId absent = accès par lien public (déjà vérifié par la signature). */
export async function loadPurchaseOrderDocument(orderId: string, businessId?: string): Promise<PurchaseOrderDocumentData | null> {
  let query = supabase.from("purchase_orders").select(`business_id, ${ORDER_SELECT}`).eq("id", orderId);
  if (businessId) query = query.eq("business_id", businessId);
  const { data } = await query.maybeSingle();
  if (!data) return null;
  const ownerId = (data as unknown as { business_id: string }).business_id;

  const { data: business } = await supabase
    .from("businesses")
    .select("name, logoUrl:logo_url, address, city, phone, currency")
    .eq("id", ownerId)
    .maybeSingle();
  if (!business) return null;

  const order = data as unknown as DocOrder;
  order.items.sort((a, b) => a.position - b.position);

  const [custom, referralOn] = await Promise.all([getInvoiceCustomization(ownerId), isReferralModuleEnabled(ownerId)]);
  const code = referralOn ? await ensureReferralCode(ownerId) : null;
  const confirmed = isConfirmedOrder(order.status);
  const qrTarget = code ? referralUrl(code, confirmed ? "bon_commande" : "demande_prix") : `https://${ZINDO_SITE}`;
  return {
    order,
    business: business as unknown as PurchaseOrderDocumentData["business"],
    custom,
    qrDataUrl: await generateQrDataUrl(qrTarget),
  };
}

/**
 * Lien public envoyé au fournisseur (WhatsApp) : l'identifiant de la commande
 * signé avec SESSION_SECRET — impossible à deviner ou à modifier pour
 * consulter la commande d'un autre commerce. Même secret sur le web et dans
 * l'application Windows, donc un lien créé depuis l'une s'ouvre sur zindo.site.
 */
function sign(orderId: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET manquant");
  return createHmac("sha256", secret).update(`purchase-order:${orderId}`).digest("base64url").slice(0, 32);
}

export function purchaseOrderShareUrl(orderId: string) {
  return `https://${ZINDO_SITE}/d/${orderId}.${sign(orderId)}`;
}

export function verifyPurchaseOrderToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const orderId = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(orderId));
  return given.length === expected.length && timingSafeEqual(given, expected) ? orderId : null;
}

import { supabase } from "@/lib/supabase";

// Incrémentation atomique côté base (fonction Postgres increment_business_seq,
// voir supabase/schema.sql) — remplace le pattern Prisma "update increment
// puis lire la valeur", pour éviter toute condition de course entre deux
// ventes/produits créés au même instant.
async function nextSeq(
  businessId: string,
  field:
    | "next_product_seq"
    | "next_sale_seq"
    | "next_purchase_seq"
    | "next_session_seq"
    | "next_online_order_seq"
    | "next_invoice_seq"
    | "next_quote_seq"
    | "next_barcode_seq"
    | "next_rental_seq"
    | "next_pickup_seq"
    | "next_shipment_seq"
    | "next_patient_seq"
    | "next_repair_seq"
    | "next_table_order_seq"
    | "next_custom_order_seq"
) {
  const { data, error } = await supabase.rpc("increment_business_seq", {
    p_business_id: businessId,
    p_field: field,
  });
  if (error) throw new Error(`Échec de génération du numéro (${field}) : ${error.message}`);
  return data as number;
}

function pad(n: number) {
  return String(n).padStart(6, "0");
}

export async function generateProductReference(businessId: string) {
  const seq = await nextSeq(businessId, "next_product_seq");
  return `ZND-${pad(seq)}`;
}

export async function generateSaleNumber(businessId: string) {
  const seq = await nextSeq(businessId, "next_sale_seq");
  return `ZND-V-${pad(seq)}`;
}

export async function generatePurchaseNumber(businessId: string) {
  const seq = await nextSeq(businessId, "next_purchase_seq");
  return `ZND-A-${pad(seq)}`;
}

export async function generateSessionNumber(businessId: string) {
  const seq = await nextSeq(businessId, "next_session_seq");
  return `ZND-C-${pad(seq)}`;
}

export async function generateOnlineOrderNumber(businessId: string) {
  const seq = await nextSeq(businessId, "next_online_order_seq");
  return `ZND-CMD-${pad(seq)}`;
}

export async function generateSubscriptionInvoiceNumber(businessId: string) {
  const seq = await nextSeq(businessId, "next_invoice_seq");
  return `ZND-FAC-${pad(seq)}`;
}

export async function generateQuoteNumber(businessId: string) {
  const seq = await nextSeq(businessId, "next_quote_seq");
  return `ZND-D-${pad(seq)}`;
}

export async function generateRentalNumber(businessId: string) {
  const seq = await nextSeq(businessId, "next_rental_seq");
  return `ZND-LOC-${pad(seq)}`;
}

export async function generatePickupNumber(businessId: string) {
  const seq = await nextSeq(businessId, "next_pickup_seq");
  return `ZND-ENL-${pad(seq)}`;
}

export async function generateShipmentNumber(businessId: string) {
  const seq = await nextSeq(businessId, "next_shipment_seq");
  return `ZND-EXP-${pad(seq)}`;
}

export async function generateRepairNumber(businessId: string) {
  const seq = await nextSeq(businessId, "next_repair_seq");
  return `ZND-REP-${pad(seq)}`;
}

export async function generateTableOrderNumber(businessId: string) {
  const seq = await nextSeq(businessId, "next_table_order_seq");
  return `ZND-TBL-${pad(seq)}`;
}

export async function generateCustomOrderNumber(businessId: string) {
  const seq = await nextSeq(businessId, "next_custom_order_seq");
  return `ZND-CMS-${pad(seq)}`;
}

/** Code patient auto-généré (cabinet médical) — ex. PAT-00001. Voir lib/actions/consultations.ts. */
export async function generatePatientCode(businessId: string) {
  const seq = await nextSeq(businessId, "next_patient_seq");
  return `PAT-${String(seq).padStart(5, "0")}`;
}

/** Chiffre de contrôle EAN-13 standard (modulo 10, poids 1/3 alternés). */
function ean13CheckDigit(body12: string) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(body12[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Génère un vrai code-barres EAN-13 pour un produit qui n'en a pas — jamais
 * la référence/SKU du produit (illisible pour la plupart des scanners de
 * caisse standards, qui attendent un format numérique EAN/UPC). Préfixe "2" :
 * plage explicitement réservée par GS1 à la numérotation interne/en boutique
 * ("restricted circulation numbers"), donc jamais en conflit avec le vrai
 * code-barres d'un produit du commerce.
 */
export async function generateProductBarcode(businessId: string) {
  const seq = await nextSeq(businessId, "next_barcode_seq");
  const body = `2${String(seq).padStart(11, "0")}`;
  return `${body}${ean13CheckDigit(body)}`;
}

export function generateInventoryReference() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(
    d.getMinutes()
  ).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
  return `INV-${stamp}`;
}

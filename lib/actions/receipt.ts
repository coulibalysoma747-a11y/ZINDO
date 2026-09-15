"use server";

import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getVerificationUrl } from "@/lib/verification";
import { generateQrDataUrl } from "@/lib/qrcode";
import { getInvoiceCustomization } from "@/lib/invoice-customization";
import type { ReceiptData, ReceiptWidth } from "@/components/sales/Receipt";
import type { FactureData } from "@/components/sales/Facture";

const PAYMENT_LABELS: Record<string, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
};

const STATUS_LABELS: Record<string, string> = {
  PAYEE: "Facture intégralement réglée",
  PARTIELLE: "Facture partiellement réglée",
  CREDIT: "Facture à crédit (non réglée)",
  ANNULEE: "Facture annulée",
};

type SaleRow = {
  id: string;
  number: string;
  createdAt: string;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  paymentMethod: string;
  status: string;
  documentType: string;
  items: Array<{
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
    product: { reference: string; name: string; unit: string };
  }>;
  customer: { name: string; phone: string | null; address: string | null } | null;
  user: { firstName: string; lastName: string };
  location: { name: string; address: string | null };
};

export type SaleDocument =
  | {
      success: true;
      saleId: string;
      documentType: "TICKET";
      data: ReceiptData;
      defaultWidth: ReceiptWidth;
      isCancelled: boolean;
      canEdit: boolean;
    }
  | { success: true; saleId: string; documentType: "FACTURE"; data: FactureData; isCancelled: boolean; canEdit: boolean }
  | { success: false; error: string };

/**
 * Charge et met en forme les données d'impression d'une vente (ticket ou
 * facture) — partagé entre app/(app)/ventes/[id]/page.tsx (page dédiée,
 * réimpression depuis l'historique) et le panneau d'impression affiché
 * directement sur l'écran de caisse juste après avoir encaissé (voir POS.tsx),
 * pour ne jamais avoir à quitter la page Vente.
 */
export async function getSaleDocumentAction(saleId: string): Promise<SaleDocument> {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const { data: saleRow } = await supabase
    .from("sales")
    .select(
      "id, number, createdAt:created_at, subtotal, discount, total, amountPaid:amount_paid, paymentMethod:payment_method, status, documentType:document_type, " +
        "items:sale_items(quantity, unitPrice:unit_price, discount, total, product:products(reference, name, unit)), " +
        "customer:customers(name, phone, address), user:users(firstName:first_name, lastName:last_name), location:locations(name, address)"
    )
    .eq("id", saleId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!saleRow) return { success: false, error: "Vente introuvable" };
  const sale = saleRow as unknown as SaleRow;

  const business = user.business;
  const remaining = Math.max(0, sale.total - sale.amountPaid);
  const change = Math.max(0, sale.amountPaid - sale.total);

  const verificationUrl = await getVerificationUrl(sale.id);
  const qrCodeDataUrl = await generateQrDataUrl(verificationUrl);
  const canEdit = await hasPermission(user.businessId, user.role, PERMISSIONS.SALES_CREATE, user.id);
  const paymentMethodLabel = PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod;
  const cashierName = `${sale.user.firstName} ${sale.user.lastName}`;
  const isCancelled = sale.status === "ANNULEE";

  if (sale.documentType === "FACTURE") {
    const customization = await getInvoiceCustomization(user.businessId);
    const factureData: FactureData = {
      businessName: business.name,
      businessActivity: business.activity,
      businessPhone: business.phone,
      businessAddress: business.address,
      businessEmail: business.email,
      businessCity: business.city,
      logoUrl: business.logoUrl,
      locationName: sale.location.name,
      locationAddress: sale.location.address,
      invoiceNumber: sale.number,
      date: new Date(sale.createdAt),
      cashierName,
      customerName: sale.customer?.name,
      customerPhone: sale.customer?.phone,
      customerAddress: sale.customer?.address,
      items: sale.items.map((item) => ({
        reference: item.product.reference,
        name: item.product.name,
        unit: item.product.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.total,
      })),
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      paymentMethodLabel,
      amountPaid: sale.amountPaid,
      change,
      remaining,
      footerMessage: business.ticketFooter,
      currency: business.currency,
      qrCodeDataUrl,
      tagline: customization.invoiceTagline,
      mobileMoneyInfo: customization.mobileMoneyInfo,
      signerName: customization.invoiceSignerName,
      returnPolicy: customization.invoiceReturnPolicy,
      statusLabel: STATUS_LABELS[sale.status] ?? null,
    };
    return { success: true, saleId: sale.id, documentType: "FACTURE", data: factureData, isCancelled, canEdit };
  }

  const receiptData: ReceiptData = {
    businessName: business.name,
    businessPhone: business.phone,
    businessAddress: business.address,
    logoUrl: business.logoUrl,
    locationName: sale.location.name,
    locationAddress: sale.location.address,
    ticketNumber: sale.number,
    date: new Date(sale.createdAt),
    cashierName,
    customerName: sale.customer?.name,
    items: sale.items.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    paymentMethodLabel,
    amountPaid: sale.amountPaid,
    change,
    remaining,
    footerMessage: business.ticketFooter,
    currency: business.currency,
    qrCodeDataUrl,
    qrCodeSize: business.qrCodeSize,
  };

  return {
    success: true,
    saleId: sale.id,
    documentType: "TICKET",
    data: receiptData,
    defaultWidth: (user.printerTicketWidth ?? business.ticketWidth) as ReceiptWidth,
    isCancelled,
    canEdit,
  };
}

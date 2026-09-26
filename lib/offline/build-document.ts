import type { ReceiptData, ReceiptWidth } from "@/components/sales/Receipt";
import type { FactureData } from "@/components/sales/Facture";
import type { SaleDocument } from "@/lib/actions/receipt";
import type { CachedBusinessInfo, CachedCustomer } from "@/lib/offline/db";
import type { CartItemInput } from "@/lib/actions/sales";

const PAYMENT_LABELS: Record<string, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
};

/**
 * Construit un ticket/une facture à imprimer pour une vente enregistrée
 * hors ligne, à partir des seules données déjà en cache local — sans appel
 * réseau. Pas de numéro de vente définitif (attribué par le serveur à la
 * synchro) ni de QR code de vérification (le lien de vérification pointe
 * vers une vente qui n'existe pas encore côté serveur) : ce sont les deux
 * seules différences visibles avec un ticket imprimé en ligne.
 */
export function buildOfflineDocument(params: {
  documentType: "TICKET" | "FACTURE";
  clientRef: string;
  items: Array<CartItemInput & { name: string; unit: string }>;
  cashierName: string;
  customer: CachedCustomer | null;
  business: CachedBusinessInfo;
  paymentMethod: string;
  discount: number;
  amountPaid: number;
  defaultWidth: ReceiptWidth;
  /** N° de ticket saisi à la caisse (voir lib/manual-sale-number.ts) — sinon numéro provisoire "HL-…". */
  number?: string;
}): Extract<SaleDocument, { success: true }> {
  const subtotal = params.items.reduce((sum, i) => sum + i.unitPrice * i.quantity - i.discount, 0);
  const total = Math.max(0, subtotal - params.discount);
  const change = Math.max(0, params.amountPaid - total);
  const remaining = Math.max(0, total - params.amountPaid);
  const paymentMethodLabel = PAYMENT_LABELS[params.paymentMethod] ?? params.paymentMethod;
  const offlineNumber = params.number ?? `HL-${params.clientRef.slice(0, 8).toUpperCase()}`;

  if (params.documentType === "FACTURE") {
    const data: FactureData = {
      businessName: params.business.businessName,
      businessActivity: params.business.businessActivity,
      businessPhone: params.business.businessPhone,
      businessAddress: params.business.businessAddress,
      businessCity: params.business.businessCity,
      locationName: params.business.locationName,
      locationAddress: params.business.locationAddress,
      logoUrl: params.business.logoUrl,
      invoiceNumber: offlineNumber,
      date: new Date(),
      cashierName: params.cashierName,
      customerName: params.customer?.name,
      customerPhone: params.customer?.phone ?? undefined,
      items: params.items.map((i) => ({
        name: i.name,
        unit: i.unit,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        total: i.unitPrice * i.quantity - i.discount,
      })),
      subtotal,
      discount: params.discount,
      total,
      paymentMethodLabel,
      amountPaid: params.amountPaid,
      change,
      remaining,
      footerMessage: params.business.footerMessage,
      currency: params.business.currency,
      qrCodeDataUrl: null,
      zindoMention: params.business.zindoMention,
    };
    return { success: true, saleId: params.clientRef, documentType: "FACTURE", data, isCancelled: false, canEdit: false };
  }

  const data: ReceiptData = {
    businessName: params.business.businessName,
    businessPhone: params.business.businessPhone,
    businessAddress: params.business.businessAddress,
    locationName: params.business.locationName,
    locationAddress: params.business.locationAddress,
    logoUrl: params.business.logoUrl,
    ticketNumber: offlineNumber,
    date: new Date(),
    cashierName: params.cashierName,
    customerName: params.customer?.name,
    items: params.items.map((i) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.unitPrice * i.quantity - i.discount })),
    subtotal,
    discount: params.discount,
    total,
    paymentMethodLabel,
    amountPaid: params.amountPaid,
    change,
    remaining,
    footerMessage: params.business.footerMessage,
    currency: params.business.currency,
    qrCodeDataUrl: null,
    qrCodeSize: params.business.qrCodeSize,
    zindoMention: params.business.zindoMention,
  };
  return { success: true, saleId: params.clientRef, documentType: "TICKET", data, defaultWidth: params.defaultWidth, isCancelled: false, canEdit: false };
}

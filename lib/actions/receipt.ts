"use server";

import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getVerificationUrl } from "@/lib/verification";
import { generateQrDataUrl } from "@/lib/qrcode";
import { getInvoiceCustomization } from "@/lib/invoice-customization";
import { getBusinessSettings } from "@/lib/business-settings";
import { isInvoiceTemplatesModuleEnabled } from "@/lib/actions/invoice-templates";
import { isZindoMentionEnabled } from "@/lib/zindo-mention";
import type { ReceiptData, ReceiptWidth } from "@/components/sales/Receipt";
import type { FactureData } from "@/components/sales/Facture";
import type { FactureEnginData } from "@/components/sales/FactureEngin";

const PAYMENT_LABELS: Record<string, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
  MIXTE: "Mixte (espèces + mobile money)",
};

const STATUS_LABELS: Record<string, string> = {
  PAYEE: "Facture intégralement réglée",
  PARTIELLE: "Facture partiellement réglée",
  CREDIT: "Facture à crédit (non réglée)",
  ANNULEE: "Facture annulée",
};

type VehicleSaleDetailsRow = {
  engineType: string | null;
  brand: string | null;
  modelLabel: string | null;
  designation: string | null;
  chassisNumber: string | null;
  engineNumber: string | null;
  color: string | null;
  condition: string | null;
  quantity: number;
  customerName: string | null;
  customerCivility: string | null;
  customerProfession: string | null;
  customerIdType: string | null;
  customerIdNumber: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  warranty: boolean;
  warrantyDuration: string | null;
  warrantyMileageLimit: string | null;
  warrantyCoveredItems: string | null;
  warrantyConditions: string | null;
  accessoryHelmet: boolean;
  accessoryToolKit: boolean;
  accessoryManual: boolean;
  accessoryKeys: boolean;
  accessorySafetyVest: boolean;
  accessoryOther: string | null;
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
    unitLabel: string | null;
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
  | { success: true; saleId: string; documentType: "FACTURE_ENGIN"; data: FactureEnginData; isCancelled: boolean; canEdit: boolean }
  | { success: false; error: string };

/**
 * Charge et met en forme les données d'impression d'une vente (ticket ou
 * facture) — partagé entre app/(app)/ventes/[id]/page.tsx (page dédiée,
 * réimpression depuis l'historique) et le panneau d'impression affiché
 * directement sur l'écran de caisse juste après avoir encaissé (voir POS.tsx),
 * pour ne jamais avoir à quitter la page Vente.
 */
export async function getSaleDocumentAction(saleId: string, formatOverride?: "TICKET" | "FACTURE"): Promise<SaleDocument> {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);

  const SALE_SELECT_BASE =
    "id, number, createdAt:created_at, subtotal, discount, total, amountPaid:amount_paid, paymentMethod:payment_method, status, documentType:document_type, " +
    "customer:customers(name, phone, address), user:users(firstName:first_name, lastName:last_name), location:locations(name, address)";

  // La colonne sale_items.unit_label (libellé de conditionnement, ex. "Carton
  // de 12") peut ne pas encore exister si la migration n'a pas été exécutée —
  // dans ce cas, repli sur une sélection sans elle plutôt que de faire
  // échouer TOUT affichage/impression de reçu (pas seulement les ventes par
  // conditionnement).
  let { data: saleRow, error: saleError } = await supabase
    .from("sales")
    .select(
      `${SALE_SELECT_BASE}, items:sale_items(quantity, unitPrice:unit_price, discount, total, unitLabel:unit_label, product:products(reference, name, unit))`
    )
    .eq("id", saleId)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (saleError && /unit_label/.test(saleError.message)) {
    const fallback = await supabase
      .from("sales")
      .select(`${SALE_SELECT_BASE}, items:sale_items(quantity, unitPrice:unit_price, discount, total, product:products(reference, name, unit))`)
      .eq("id", saleId)
      .eq("business_id", user.businessId)
      .maybeSingle();
    saleRow = fallback.data
      ? ({ ...fallback.data, items: fallback.data.items.map((i) => ({ ...i, unitLabel: null })) } as unknown as typeof saleRow)
      : null;
  }
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
  const zindoMention = await isZindoMentionEnabled(user.businessId);

  // "Choisir le format d'impression" (Paramètres) : formatOverride permet
  // d'imprimer la même vente dans l'autre format sans jamais changer le
  // documentType enregistré — voir app/(app)/ventes/[id]/page.tsx.
  const effectiveType = formatOverride ?? sale.documentType;

  if (effectiveType === "FACTURE") {
    const [customization, invoiceTemplatesEnabled, businessSettings] = await Promise.all([
      getInvoiceCustomization(user.businessId),
      isInvoiceTemplatesModuleEnabled(user.businessId),
      getBusinessSettings(user.businessId),
    ]);
    // Le réglage n'a d'effet que si le flag est activé pour ce commerce —
    // sinon tout le monde reste sur "classique", même si la valeur stockée a
    // changé (ex. flag désactivé après avoir été testé).
    const templateId = invoiceTemplatesEnabled ? businessSettings.invoiceTemplate : "classique";

    // Une vente d'engin (module Vente Engin) porte toujours une ligne
    // vehicle_sale_details — dans ce cas, la facture imprimée est la
    // FactureEngin dédiée (fiche du véhicule vendu) plutôt que la facture
    // générique. Best-effort : si la table n'existe pas encore (migration
    // pas encore exécutée), on retombe simplement sur la facture générique.
    let vehicleDetails: VehicleSaleDetailsRow | null = null;
    try {
      const { data } = await supabase
        .from("vehicle_sale_details")
        .select(
          "engineType:engine_type, brand, modelLabel:model_label, designation, chassisNumber:chassis_number, engineNumber:engine_number, color, quantity, " +
            "customerName:customer_name, customerCivility:customer_civility, customerProfession:customer_profession, customerIdType:customer_id_type, customerIdNumber:customer_id_number, " +
            "customerAddress:customer_address, customerPhone:customer_phone, customerEmail:customer_email, " +
            "warranty, warrantyDuration:warranty_duration, warrantyMileageLimit:warranty_mileage_limit, warrantyCoveredItems:warranty_covered_items, warrantyConditions:warranty_conditions, " +
            "accessoryHelmet:accessory_helmet, accessoryToolKit:accessory_tool_kit, accessoryManual:accessory_manual, accessoryKeys:accessory_keys, accessorySafetyVest:accessory_safety_vest, accessoryOther:accessory_other, condition"
        )
        .eq("sale_id", sale.id)
        .maybeSingle();
      vehicleDetails = data as unknown as VehicleSaleDetailsRow | null;
    } catch (e) {
      console.error("[getSaleDocumentAction] Échec de la lecture des détails d'engin :", e);
    }

    if (vehicleDetails) {
      const factureEnginData: FactureEnginData = {
        businessName: business.name,
        businessActivity: business.activity,
        businessPhone: business.phone,
        businessAddress: business.address,
        businessCity: business.city,
        logoUrl: business.logoUrl,
        invoiceNumber: sale.number,
        date: new Date(sale.createdAt),
        signerName: customization.invoiceSignerName,
        customerName: vehicleDetails.customerName ?? sale.customer?.name,
        customerCivility: vehicleDetails.customerCivility,
        customerProfession: vehicleDetails.customerProfession,
        customerIdType: vehicleDetails.customerIdType,
        customerIdNumber: vehicleDetails.customerIdNumber,
        customerAddress: vehicleDetails.customerAddress ?? sale.customer?.address,
        customerPhone: vehicleDetails.customerPhone ?? sale.customer?.phone,
        customerEmail: vehicleDetails.customerEmail,
        engineType: vehicleDetails.engineType,
        brand: vehicleDetails.brand,
        modelLabel: vehicleDetails.modelLabel,
        designation: vehicleDetails.designation,
        chassisNumber: vehicleDetails.chassisNumber,
        engineNumber: vehicleDetails.engineNumber,
        color: vehicleDetails.color,
        condition: vehicleDetails.condition,
        quantity: vehicleDetails.quantity,
        total: sale.total,
        remaining,
        accessoryHelmet: vehicleDetails.accessoryHelmet,
        accessoryToolKit: vehicleDetails.accessoryToolKit,
        accessoryManual: vehicleDetails.accessoryManual,
        accessoryKeys: vehicleDetails.accessoryKeys,
        accessorySafetyVest: vehicleDetails.accessorySafetyVest,
        accessoryOther: vehicleDetails.accessoryOther,
        warranty: vehicleDetails.warranty,
        warrantyDuration: vehicleDetails.warrantyDuration,
        warrantyMileageLimit: vehicleDetails.warrantyMileageLimit,
        warrantyCoveredItems: vehicleDetails.warrantyCoveredItems,
        warrantyConditions: vehicleDetails.warrantyConditions,
        locationName: sale.location.name,
        cashierName,
        qrCodeDataUrl,
        footerMessage: "Merci pour la confiance",
        currency: business.currency,
      };
      return { success: true, saleId: sale.id, documentType: "FACTURE_ENGIN", data: factureEnginData, isCancelled, canEdit };
    }
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
        name: item.unitLabel ? `${item.product.name} (${item.unitLabel})` : item.product.name,
        unit: item.unitLabel ?? item.product.unit,
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
      ifu: customization.ifu,
      rccm: customization.rccm,
      templateId,
      zindoMention,
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
      name: item.unitLabel ? `${item.product.name} (${item.unitLabel})` : item.product.name,
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
    zindoMention,
    // Bon de retour (lib/actions/sale-returns.ts) : total et payé négatifs ;
    // payé - total = part déduite de la dette plutôt que rendue en argent.
    ...(sale.documentType === "RETOUR" && {
      isReturn: true,
      returnDebtReduced: Math.max(0, sale.amountPaid - sale.total),
      change: 0,
      remaining: 0,
    }),
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

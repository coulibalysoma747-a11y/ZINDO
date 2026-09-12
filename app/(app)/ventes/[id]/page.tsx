import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getVerificationUrl } from "@/lib/verification";
import { generateQrDataUrl } from "@/lib/qrcode";
import type { ReceiptData, ReceiptWidth } from "@/components/sales/Receipt";
import type { FactureData } from "@/components/sales/Facture";
import { SaleReceiptView } from "./SaleReceiptView";
import { FactureView } from "./FactureView";

const PAYMENT_LABELS: Record<string, string> = {
  ESPECES: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  CARTE: "Carte bancaire",
  CREDIT: "Crédit",
  AUTRE: "Autre",
};

export default async function SaleReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.SALES_VIEW);
  const { id } = await params;

  const sale = await prisma.sale.findFirst({
    where: { id, businessId: user.businessId },
    include: { items: { include: { product: true } }, customer: true, user: true, location: true },
  });
  if (!sale) notFound();

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
    const factureData: FactureData = {
      businessName: business.name,
      businessPhone: business.phone,
      businessAddress: business.address,
      businessEmail: business.email,
      logoUrl: business.logoUrl,
      locationName: sale.location.name,
      locationAddress: sale.location.address,
      invoiceNumber: sale.number,
      date: sale.createdAt,
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
    };

    return (
      <FactureView data={factureData} saleId={sale.id} isCancelled={isCancelled} canEdit={canEdit} />
    );
  }

  const receiptData: ReceiptData = {
    businessName: business.name,
    businessPhone: business.phone,
    businessAddress: business.address,
    logoUrl: business.logoUrl,
    locationName: sale.location.name,
    locationAddress: sale.location.address,
    ticketNumber: sale.number,
    date: sale.createdAt,
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

  return (
    <SaleReceiptView
      data={receiptData}
      defaultWidth={(user.printerTicketWidth ?? business.ticketWidth) as ReceiptWidth}
      saleId={sale.id}
      isCancelled={isCancelled}
      canEdit={canEdit}
    />
  );
}

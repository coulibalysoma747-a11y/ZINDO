import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isTicketTestEnabled } from "@/lib/ticket-test";
import { generateQrDataUrl } from "@/lib/qrcode";
import type { ReceiptData, ReceiptWidth } from "@/components/sales/Receipt";
import { TicketTestView } from "./TicketTestView";

// Vente fictive : rien n'est enregistré, le stock n'est pas touché.
const SAMPLE_ITEMS = [
  { name: "Article test A", quantity: 2, unitPrice: 2500, total: 5000 },
  { name: "Article test B", quantity: 1, unitPrice: 3500, total: 3500 },
];

/** Ticket test (flag ticket_test) : vérifie l'imprimante avec les réglages enregistrés du commerce. */
export default async function TicketTestPage() {
  const user = await requireUser();
  if (!(await isTicketTestEnabled(user.businessId))) notFound();

  const business = user.business;
  const total = SAMPLE_ITEMS.reduce((sum, item) => sum + item.total, 0);
  const amountPaid = 10000;
  let qrCodeDataUrl: string | null = null;
  try {
    qrCodeDataUrl = await generateQrDataUrl("ZINDO — ticket test");
  } catch {
    // Le ticket reste imprimable sans QR code.
  }

  const data: ReceiptData = {
    businessName: business.name,
    businessPhone: business.phone,
    businessAddress: business.address,
    logoUrl: business.logoUrl,
    ticketNumber: "TICKET TEST",
    date: new Date(),
    cashierName: `${user.firstName} ${user.lastName}`.trim(),
    items: SAMPLE_ITEMS,
    subtotal: total,
    discount: 0,
    total,
    paymentMethodLabel: "Espèces",
    amountPaid,
    change: amountPaid - total,
    footerMessage: business.ticketFooter,
    currency: business.currency,
    qrCodeDataUrl,
    qrCodeSize: business.qrCodeSize,
  };

  return <TicketTestView data={data} defaultWidth={(user.printerTicketWidth ?? business.ticketWidth) as ReceiptWidth} />;
}

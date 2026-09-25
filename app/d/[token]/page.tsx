import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPurchaseOrderDocument, verifyPurchaseOrderToken } from "@/lib/purchase-order-document";
import { PurchaseOrderDocument } from "@/components/purchase-orders/PurchaseOrderDocument";
import { PrintDocumentButton } from "@/components/purchase-orders/PrintDocumentButton";

export const metadata: Metadata = {
  title: "Document fournisseur — ZINDO",
  robots: { index: false, follow: false },
};

/**
 * Page publique ouverte par le fournisseur depuis le lien WhatsApp : la
 * demande de prix ou le bon de commande, consultable et téléchargeable en PDF
 * sans compte ZINDO. Accès uniquement par lien signé (lib/purchase-order-document.ts).
 */
export default async function SharedPurchaseOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const orderId = verifyPurchaseOrderToken(decodeURIComponent(token));
  if (!orderId) notFound();

  const data = await loadPurchaseOrderDocument(orderId);
  if (!data || data.order.status === "ANNULEE") notFound();

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-zinc-600">
          Document envoyé par <span className="font-semibold">{data.business.name}</span>
        </p>
        <PrintDocumentButton />
      </div>
      <PurchaseOrderDocument data={data} />
    </div>
  );
}

import { notFound } from "next/navigation";
import { getSaleDocumentAction } from "@/lib/actions/receipt";
import { SaleReceiptView } from "./SaleReceiptView";
import { FactureView } from "./FactureView";

export default async function SaleReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getSaleDocumentAction(id);
  if (!doc.success) notFound();

  if (doc.documentType === "FACTURE") {
    return <FactureView data={doc.data} saleId={doc.saleId} isCancelled={doc.isCancelled} canEdit={doc.canEdit} />;
  }

  return (
    <SaleReceiptView
      data={doc.data}
      defaultWidth={doc.defaultWidth}
      saleId={doc.saleId}
      isCancelled={doc.isCancelled}
      canEdit={doc.canEdit}
    />
  );
}

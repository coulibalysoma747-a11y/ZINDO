import { notFound } from "next/navigation";
import { getQuoteDocumentAction } from "@/lib/actions/quotes";
import { getEnabledPaymentMethods } from "@/lib/actions/sales";
import { DevisView } from "./DevisView";

export default async function DevisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [doc, paymentMethods] = await Promise.all([getQuoteDocumentAction(id), getEnabledPaymentMethods()]);
  if (!doc.success) notFound();

  return (
    <DevisView
      quoteId={doc.quoteId}
      status={doc.status}
      canEdit={doc.canEdit}
      canConvert={doc.canConvert}
      data={doc.data}
      paymentMethods={paymentMethods}
    />
  );
}

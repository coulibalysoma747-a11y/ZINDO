import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getSaleDocumentAction } from "@/lib/actions/receipt";
import { getInstallmentPlanAction } from "@/lib/actions/installments";
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

  const user = await requireUser();
  const [{ data: saleRow }, installmentPlan] = await Promise.all([
    supabase
      .from("sales")
      .select("status, customerId:customer_id")
      .eq("id", id)
      .eq("business_id", user.businessId)
      .maybeSingle(),
    getInstallmentPlanAction(id),
  ]);
  const canOfferInstallments =
    !!saleRow?.customerId && (saleRow?.status === "CREDIT" || saleRow?.status === "PARTIELLE") && !doc.isCancelled;

  if (doc.documentType === "FACTURE") {
    return (
      <FactureView
        data={doc.data}
        saleId={doc.saleId}
        isCancelled={doc.isCancelled}
        canEdit={doc.canEdit}
        canOfferInstallments={canOfferInstallments}
        installmentPlan={installmentPlan}
      />
    );
  }

  return (
    <SaleReceiptView
      data={doc.data}
      defaultWidth={doc.defaultWidth}
      saleId={doc.saleId}
      isCancelled={doc.isCancelled}
      canEdit={doc.canEdit}
      canOfferInstallments={canOfferInstallments}
      installmentPlan={installmentPlan}
    />
  );
}

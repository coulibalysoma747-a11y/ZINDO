import { notFound } from "next/navigation";
import { hasPermission, requireUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { isSaleCancelAlertEnabled } from "@/lib/sale-cancel-alert";
import { DeleteSaleButton } from "./DeleteSaleButton";
import { supabase } from "@/lib/supabase";
import { getSaleDocumentAction } from "@/lib/actions/receipt";
import { getInstallmentPlanAction } from "@/lib/actions/installments";
import { getBusinessSettings } from "@/lib/business-settings";
import { SaleReceiptView } from "./SaleReceiptView";
import { FactureView } from "./FactureView";
import { FactureEnginView } from "./FactureEnginView";
import { SaleReturnPanel } from "./SaleReturnPanel";
import { getSaleReturnInfo, isSaleReturnEnabled } from "@/lib/sale-returns";

export default async function SaleReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ format?: string }>;
}) {
  const { id } = await params;
  const { format } = await searchParams;
  let doc = await getSaleDocumentAction(id);
  if (!doc.success) notFound();

  const user = await requireUser();
  const [{ data: saleRow }, installmentPlan, businessSettings] = await Promise.all([
    supabase
      .from("sales")
      .select("status, customerId:customer_id")
      .eq("id", id)
      .eq("business_id", user.businessId)
      .maybeSingle(),
    getInstallmentPlanAction(id),
    getBusinessSettings(user.businessId),
  ]);
  // Retour / échange (flag retour_partiel) : bandeau au-dessus du document.
  const returnInfo = (await isSaleReturnEnabled(user.businessId)) ? await getSaleReturnInfo(id, user.businessId) : null;
  const returnPanel = returnInfo ? (
    <SaleReturnPanel
      saleId={id}
      currency={user.business.currency}
      isCancelled={doc.isCancelled}
      original={returnInfo.original}
      returns={returnInfo.returns}
      lines={returnInfo.lines}
      hasVehicleUnits={returnInfo.hasVehicleUnits}
      remainingDebt={returnInfo.remainingDebt}
    />
  ) : null;
  // Suppression d'une vente annulée (flag alerte_vente_annulee + droit dédié).
  const canDelete =
    doc.isCancelled &&
    (await isSaleCancelAlertEnabled(user.businessId)) &&
    (await hasPermission(user.businessId, user.role, PERMISSIONS.SALES_DELETE, user.id));
  const deletePanel = canDelete ? (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
      <p className="text-sm text-red-700 dark:text-red-300">Cette vente est annulée. Vous pouvez la supprimer définitivement.</p>
      <DeleteSaleButton saleId={id} />
    </div>
  ) : null;
  // Une vente qui a des retours, ou un bon de retour, ne se modifie plus.
  const linkedToReturn = !!returnInfo && (!!returnInfo.original || returnInfo.returns.some((r) => r.status !== "ANNULEE"));
  const canEdit = doc.canEdit && !linkedToReturn;

  const canOfferInstallments =
    !!saleRow?.customerId && (saleRow?.status === "CREDIT" || saleRow?.status === "PARTIELLE") && !doc.isCancelled;

  // "Choisir le format d'impression" (Paramètres) : après une vente, un
  // bouton permet d'imprimer aussi dans l'autre format (même vente, même
  // numéro, rien n'est enregistré en double) — voir ReceiptActions. Jamais
  // proposé pour une facture d'engin (documentation réglementaire dédiée).
  const dualFormatAllowed = businessSettings.dualFormatPrintingEnabled && doc.documentType !== "FACTURE_ENGIN";
  if (dualFormatAllowed && (format === "facture" || format === "ticket")) {
    const overridden = await getSaleDocumentAction(id, format === "facture" ? "FACTURE" : "TICKET");
    if (overridden.success) doc = overridden;
  }
  const otherFormatHref = dualFormatAllowed
    ? `/ventes/${id}?format=${doc.documentType === "FACTURE" ? "ticket" : "facture"}&print=1`
    : null;
  const otherFormatLabel = doc.documentType === "FACTURE" ? "Imprimer en ticket" : "Imprimer en A4";

  if (doc.documentType === "FACTURE_ENGIN") {
    return (
      <>
      {deletePanel}
      {returnPanel}
      <FactureEnginView
        data={doc.data}
        saleId={doc.saleId}
        isCancelled={doc.isCancelled}
        canEdit={canEdit}
        canOfferInstallments={canOfferInstallments}
        installmentPlan={installmentPlan}
      />
      </>
    );
  }

  if (doc.documentType === "FACTURE") {
    return (
      <>
      {deletePanel}
      {returnPanel}
      <FactureView
        data={doc.data}
        saleId={doc.saleId}
        isCancelled={doc.isCancelled}
        canEdit={canEdit}
        canOfferInstallments={canOfferInstallments}
        installmentPlan={installmentPlan}
        otherFormatHref={otherFormatHref}
        otherFormatLabel={otherFormatLabel}
      />
      </>
    );
  }

  return (
    <>
    {deletePanel}
    {returnPanel}
    <SaleReceiptView
      data={doc.data}
      defaultWidth={doc.defaultWidth}
      saleId={doc.saleId}
      isCancelled={doc.isCancelled}
      canEdit={canEdit}
      canOfferInstallments={canOfferInstallments}
      installmentPlan={installmentPlan}
      otherFormatHref={otherFormatHref}
      otherFormatLabel={otherFormatLabel}
    />
    </>
  );
}

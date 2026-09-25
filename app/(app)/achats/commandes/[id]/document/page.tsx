import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { isPurchaseOrdersModuleEnabled } from "@/lib/actions/purchase-orders";
import { loadPurchaseOrderDocument } from "@/lib/purchase-order-document";
import { PurchaseOrderDocument } from "@/components/purchase-orders/PurchaseOrderDocument";
import { PrintDocumentButton } from "@/components/purchase-orders/PrintDocumentButton";

export default async function PurchaseOrderDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission(PERMISSIONS.PURCHASES_MANAGE);
  if (!(await isPurchaseOrdersModuleEnabled(user.businessId))) notFound();

  const data = await loadPurchaseOrderDocument(id, user.businessId);
  if (!data) notFound();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/achats/commandes/${id}`} className="text-sm text-zinc-500 hover:underline">
          ← Retour
        </Link>
        <PrintDocumentButton />
      </div>
      <PurchaseOrderDocument data={data} />
    </div>
  );
}

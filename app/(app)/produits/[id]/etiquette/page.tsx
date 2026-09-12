import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { LabelPrintView } from "./LabelPrintView";

export default async function ProductLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);
  const { id } = await params;

  const product = await prisma.product.findFirst({ where: { id, businessId: user.businessId } });
  if (!product) notFound();

  return (
    <LabelPrintView
      productId={product.id}
      data={{
        businessName: user.business.name,
        productName: product.name,
        code: product.barcode || product.reference,
        salePrice: product.salePrice,
        currency: user.business.currency,
      }}
    />
  );
}

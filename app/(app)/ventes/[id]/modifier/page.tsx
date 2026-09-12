import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getEnabledPaymentMethods } from "@/lib/actions/sales";
import { getPosProductsAction } from "@/lib/actions/product-search";
import { EditSaleForm } from "./EditSaleForm";

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  const { id } = await params;

  const sale = await prisma.sale.findFirst({
    where: { id, businessId: user.businessId },
    include: { items: { include: { product: true } }, location: true },
  });
  if (!sale) notFound();
  if (sale.status === "ANNULEE") notFound();

  const [customers, paymentMethods, posProducts, stocks] = await Promise.all([
    prisma.customer.findMany({
      where: { businessId: user.businessId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    }),
    getEnabledPaymentMethods(),
    getPosProductsAction(sale.locationId),
    prisma.productStock.findMany({
      where: { productId: { in: sale.items.map((i) => i.productId) }, locationId: sale.locationId },
    }),
  ]);

  const stockMap = new Map(stocks.map((s) => [s.productId, s.quantity]));
  const itemProductIds = new Set(sale.items.map((i) => i.productId));

  const initialItems = sale.items.map((item) => ({
    product: {
      id: item.product.id,
      name: item.product.name,
      reference: item.product.reference,
      barcode: item.product.barcode,
      photoUrl: item.product.photoUrl,
      salePrice: item.product.salePrice,
      purchasePrice: item.product.purchasePrice,
      unit: item.product.unit,
      // Le stock déjà réservé par cette vente reste disponible pour la modification.
      quantity: (stockMap.get(item.productId) ?? 0) + item.quantity,
    },
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount,
  }));

  return (
    <EditSaleForm
      saleId={sale.id}
      saleNumber={sale.number}
      locationName={sale.location.name}
      currency={user.business.currency}
      customers={customers}
      paymentMethods={paymentMethods}
      posProducts={posProducts.filter((p) => !itemProductIds.has(p.id))}
      initialItems={initialItems}
      initialCustomerId={sale.customerId ?? ""}
      initialDiscount={sale.discount}
      initialPaymentMethod={sale.paymentMethod}
      initialAmountPaid={sale.amountPaid}
    />
  );
}

import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getEnabledPaymentMethods } from "@/lib/actions/sales";
import { getPosProductsAction } from "@/lib/actions/product-search";
import type { PaymentMethod } from "@/lib/db-types";
import { EditSaleForm } from "./EditSaleForm";

type SaleRow = {
  id: string;
  number: string;
  status: string;
  locationId: string;
  customerId: string | null;
  discount: number;
  paymentMethod: string;
  amountPaid: number;
  location: { name: string };
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    product: {
      id: string;
      name: string;
      reference: string;
      barcode: string | null;
      photoUrl: string | null;
      salePrice: number;
      purchasePrice: number;
      unit: string;
      trackUnits: boolean;
    };
  }>;
};

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.SALES_CREATE);
  const { id } = await params;

  const { data } = await supabase
    .from("sales")
    .select(
      "id, number, status, locationId:location_id, customerId:customer_id, discount, paymentMethod:payment_method, amountPaid:amount_paid, location:locations(name), " +
        "items:sale_items(productId:product_id, quantity, unitPrice:unit_price, discount, product:products(id, name, reference, barcode, photoUrl:photo_url, salePrice:sale_price, purchasePrice:purchase_price, unit, trackUnits:track_units))"
    )
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!data) notFound();
  const sale = data as unknown as SaleRow;
  if (sale.status === "ANNULEE") notFound();

  const [{ data: customers }, paymentMethods, posProducts, { data: stocks }] = await Promise.all([
    supabase.from("customers").select("id, name, phone").eq("business_id", user.businessId).order("name", { ascending: true }),
    getEnabledPaymentMethods(),
    getPosProductsAction(sale.locationId),
    supabase
      .from("product_stocks")
      .select("productId:product_id, quantity")
      .in("product_id", sale.items.map((i) => i.productId))
      .eq("location_id", sale.locationId),
  ]);

  const stockMap = new Map(((stocks ?? []) as Array<{ productId: string; quantity: number }>).map((s) => [s.productId, s.quantity]));
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
      trackUnits: item.product.trackUnits,
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
      customers={customers ?? []}
      paymentMethods={paymentMethods}
      posProducts={posProducts.filter((p) => !itemProductIds.has(p.id))}
      initialItems={initialItems}
      initialCustomerId={sale.customerId ?? ""}
      initialDiscount={sale.discount}
      initialPaymentMethod={sale.paymentMethod as PaymentMethod}
      initialAmountPaid={sale.amountPaid}
    />
  );
}

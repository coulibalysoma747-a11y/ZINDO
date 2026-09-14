import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { LabelPrintView } from "./LabelPrintView";

export default async function ProductLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);
  const { id } = await params;

  const { data: product } = await supabase
    .from("products")
    .select("id, name, barcode, reference, salePrice:sale_price")
    .eq("id", id)
    .eq("business_id", user.businessId)
    .maybeSingle();
  if (!product) notFound();

  return (
    <LabelPrintView
      productId={product.id as string}
      data={{
        businessName: user.business.name,
        productName: product.name as string,
        code: (product.barcode as string | null) || (product.reference as string),
        salePrice: product.salePrice as number,
        currency: user.business.currency,
      }}
    />
  );
}

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/Empty";
import { BulkLabelPrintView } from "./BulkLabelPrintView";

export default async function BulkLabelsPage() {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);

  const { data: products } = await supabase
    .from("products")
    .select("id, name, barcode, reference, salePrice:sale_price, photoUrl:photo_url")
    .eq("business_id", user.businessId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (!products || products.length === 0) {
    return <EmptyState title="Aucun produit" description="Ajoutez des produits avant d'imprimer des QR codes." />;
  }

  return (
    <BulkLabelPrintView
      products={
        products as unknown as {
          id: string;
          name: string;
          barcode: string | null;
          reference: string;
          salePrice: number;
          photoUrl: string | null;
        }[]
      }
      businessName={user.business.name}
      currency={user.business.currency}
    />
  );
}

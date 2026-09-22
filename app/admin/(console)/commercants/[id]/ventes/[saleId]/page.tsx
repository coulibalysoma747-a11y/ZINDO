import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSuperAdmin } from "@/lib/superadmin-auth";
import { supabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { AdminSaleCorrectionForm } from "./AdminSaleCorrectionForm";

const STATUS_LABELS = {
  PAYEE: "Payée",
  PARTIELLE: "Partielle",
  CREDIT: "Crédit",
  ANNULEE: "Annulée",
} as const;

const STATUS_TONE = {
  PAYEE: "emerald",
  PARTIELLE: "amber",
  CREDIT: "red",
  ANNULEE: "zinc",
} as const;

type SaleRow = {
  id: string;
  number: string;
  status: keyof typeof STATUS_LABELS;
  createdAt: string;
  locationId: string;
  customerId: string | null;
  discount: number;
  paymentMethod: string;
  amountPaid: number;
  note: string | null;
  location: { name: string };
  seller: { firstName: string; lastName: string } | null;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    multiplier: number | null;
    packagingUnitId: string | null;
    unitLabel: string | null;
    product: { id: string; name: string; reference: string; unit: string } | null;
  }>;
};

export default async function AdminSaleDetailPage({
  params,
}: {
  params: Promise<{ id: string; saleId: string }>;
}) {
  await requireSuperAdmin();
  const { id, saleId } = await params;

  const [{ data: businessData }, { data: saleData }] = await Promise.all([
    supabase.from("businesses").select("id, name, currency").eq("id", id).maybeSingle(),
    supabase
      .from("sales")
      .select(
        "id, number, status, createdAt:created_at, locationId:location_id, customerId:customer_id, discount, paymentMethod:payment_method, amountPaid:amount_paid, note, " +
          "location:locations(name), seller:users(firstName:first_name, lastName:last_name), " +
          "items:sale_items(productId:product_id, quantity, unitPrice:unit_price, discount, multiplier, packagingUnitId:packaging_unit_id, unitLabel:unit_label, product:products(id, name, reference, unit))"
      )
      .eq("id", saleId)
      .eq("business_id", id)
      .maybeSingle(),
  ]);
  if (!businessData || !saleData) notFound();
  const business = businessData as unknown as { id: string; name: string; currency: string };
  const sale = saleData as unknown as SaleRow;

  const productIds = sale.items.map((i) => i.productId);
  const [{ data: customers }, { data: stocks }] = await Promise.all([
    supabase.from("customers").select("id, name, phone").eq("business_id", id).order("name", { ascending: true }),
    productIds.length
      ? supabase.from("product_stocks").select("productId:product_id, quantity").in("product_id", productIds).eq("location_id", sale.locationId)
      : Promise.resolve({ data: [] as Array<{ productId: string; quantity: number }> }),
  ]);
  const stockMap = new Map(((stocks ?? []) as Array<{ productId: string; quantity: number }>).map((s) => [s.productId, s.quantity]));

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/commercants/${id}/ventes`}
        className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux ventes de {business.name}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-900">Vente {sale.number}</h1>
            <Badge tone={STATUS_TONE[sale.status]}>{STATUS_LABELS[sale.status]}</Badge>
          </div>
          <p className="text-sm text-zinc-500">
            {formatDateTime(new Date(sale.createdAt))} — {sale.location.name}
            {sale.seller ? ` — vendue par ${sale.seller.firstName} ${sale.seller.lastName}` : ""}
          </p>
        </div>
      </div>

      {sale.status === "ANNULEE" ? (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          Cette vente est annulée — elle ne peut plus être modifiée. Le stock a déjà été réintégré au moment de
          l&apos;annulation.
        </p>
      ) : (
        <AdminSaleCorrectionForm
          businessId={id}
          saleId={sale.id}
          saleNumber={sale.number}
          currency={business.currency}
          customers={customers ?? []}
          initialCustomerId={sale.customerId ?? ""}
          initialDiscount={sale.discount}
          initialPaymentMethod={sale.paymentMethod as "ESPECES" | "MOBILE_MONEY" | "CARTE" | "CREDIT" | "AUTRE" | "MIXTE"}
          initialAmountPaid={sale.amountPaid}
          initialNote={sale.note ?? ""}
          initialItems={sale.items.map((item) => ({
            productId: item.productId,
            name: item.product?.name ?? "Produit supprimé",
            reference: item.product?.reference ?? "",
            unit: item.product?.unit ?? "unité",
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            multiplier: item.multiplier ?? 1,
            packagingUnitId: item.packagingUnitId,
            unitLabel: item.unitLabel,
            // Le stock déjà réservé par cette vente reste disponible pour la correction.
            availableStock: (stockMap.get(item.productId) ?? 0) + item.quantity * (item.multiplier ?? 1),
          }))}
        />
      )}
    </div>
  );
}

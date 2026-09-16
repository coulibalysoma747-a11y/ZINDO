import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toRow(values: (string | number | null)[]): string {
  return values.map((v) => csvEscape(v == null ? "" : String(v))).join(",") + "\r\n";
}

/** Export CSV du catalogue (ouvre directement dans Excel) — voir /produits/importer-csv pour le sens inverse. */
export async function GET() {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_VIEW);

  const { data: products } = await supabase
    .from("products")
    .select(
      "reference, name, category:categories(name), brand, unit, purchasePrice:purchase_price, salePrice:sale_price, minStock:min_stock, barcode, active"
    )
    .eq("business_id", user.businessId)
    .order("name", { ascending: true });

  const rows = (products ?? []) as unknown as Array<{
    reference: string;
    name: string;
    category: { name: string } | null;
    brand: string | null;
    unit: string;
    purchasePrice: number;
    salePrice: number;
    minStock: number;
    barcode: string | null;
    active: boolean;
  }>;

  let csv = "﻿" + toRow(["reference", "nom", "categorie", "marque", "unite", "prix_achat", "prix_vente", "stock_minimum", "code_barres", "actif"]);
  for (const p of rows) {
    csv += toRow([
      p.reference,
      p.name,
      p.category?.name ?? "",
      p.brand ?? "",
      p.unit,
      p.purchasePrice,
      p.salePrice,
      p.minStock,
      p.barcode ?? "",
      p.active ? "1" : "0",
    ]);
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produits.csv"`,
    },
  });
}

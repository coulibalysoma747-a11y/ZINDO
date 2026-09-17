import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { authenticateApiKey } from "@/lib/api-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiKey(request);
  if (!auth) return NextResponse.json({ error: "Clé API invalide ou manquante" }, { status: 401 });
  const { id } = await params;

  const [{ data: product, error }, { data: stocks }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, reference, name, unit, purchasePrice:purchase_price, salePrice:sale_price, minStock:min_stock, barcode, active, category:categories(name), createdAt:created_at"
      )
      .eq("id", id)
      .eq("business_id", auth.businessId)
      .maybeSingle(),
    supabase.from("product_stocks").select("locationId:location_id, quantity, location:locations(name)").eq("product_id", id),
  ]);
  if (error) {
    console.error("[api/v1/products/:id] Échec de la lecture :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

  return NextResponse.json({ data: { ...product, stocks: stocks ?? [] } });
}

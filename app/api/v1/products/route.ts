import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { authenticateApiKey } from "@/lib/api-auth";

// API v1 — lecture seule (voir Paramètres > "Intégrations API"). Pagination
// simple par offset/limit, cohérente sur tous les endpoints v1.
const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (!auth) return NextResponse.json({ error: "Clé API invalide ou manquante" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

  const { data, error, count } = await supabase
    .from("products")
    .select(
      "id, reference, name, unit, purchasePrice:purchase_price, salePrice:sale_price, minStock:min_stock, barcode, active, category:categories(name), createdAt:created_at",
      { count: "exact" }
    )
    .eq("business_id", auth.businessId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) {
    console.error("[api/v1/products] Échec de la lecture :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
}

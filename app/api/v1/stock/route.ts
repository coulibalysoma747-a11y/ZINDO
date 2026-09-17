import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { authenticateApiKey } from "@/lib/api-auth";

const MAX_LIMIT = 200;

// Niveau de stock par produit et par boutique — jointure via products pour
// rester scopé au business_id de la clé (product_stocks n'a pas de
// business_id propre).
export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (!auth) return NextResponse.json({ error: "Clé API invalide ou manquante" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const locationId = searchParams.get("locationId");

  let query = supabase
    .from("product_stocks")
    .select(
      "quantity, updatedAt:updated_at, product:products!inner(id, reference, name, businessId:business_id), location:locations(id, name)",
      { count: "exact" }
    )
    .eq("products.business_id", auth.businessId)
    .range(offset, offset + limit - 1);
  if (locationId) query = query.eq("location_id", locationId);

  const { data, error, count } = await query;
  if (error) {
    console.error("[api/v1/stock] Échec de la lecture :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
}

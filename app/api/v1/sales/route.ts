import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { authenticateApiKey } from "@/lib/api-auth";

const MAX_LIMIT = 200;

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (!auth) return NextResponse.json({ error: "Clé API invalide ou manquante" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("sales")
    .select(
      "id, number, total, amountPaid:amount_paid, paymentMethod:payment_method, status, createdAt:created_at, customer:customers(id, name)",
      { count: "exact" }
    )
    .eq("business_id", auth.businessId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error, count } = await query;
  if (error) {
    console.error("[api/v1/sales] Échec de la lecture :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], pagination: { limit, offset, total: count ?? 0 } });
}

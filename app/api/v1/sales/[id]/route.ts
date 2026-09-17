import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { authenticateApiKey } from "@/lib/api-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiKey(request);
  if (!auth) return NextResponse.json({ error: "Clé API invalide ou manquante" }, { status: 401 });
  const { id } = await params;

  const { data: sale, error } = await supabase
    .from("sales")
    .select(
      "id, number, subtotal, discount, total, amountPaid:amount_paid, paymentMethod:payment_method, status, createdAt:created_at, customer:customers(id, name, phone), items:sale_items(productId:product_id, quantity, unitPrice:unit_price, discount, total, product:products(name, reference))"
    )
    .eq("id", id)
    .eq("business_id", auth.businessId)
    .maybeSingle();
  if (error) {
    console.error("[api/v1/sales/:id] Échec de la lecture :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!sale) return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });

  return NextResponse.json({ data: sale });
}

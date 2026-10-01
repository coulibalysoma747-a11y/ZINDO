import { NextRequest, NextResponse } from "next/server";
import { purgeExpiredTrash } from "@/lib/product-trash";

// Effacement automatique, une fois par jour (voir vercel.json → crons), des produits
// archivés depuis plus de 30 jours et jamais utilisés dans une vente ou un achat.
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const result = await purgeExpiredTrash();
  return NextResponse.json(result);
}

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { runFasoStockSync, type FasoStockStoreMapping } from "@/lib/faso-stock-sync";

// Synchronisation automatique périodique (voir vercel.json → crons) de tous
// les commerces ayant connecté FasoStock. Le sens reste FasoStock → ZINDO
// (API FasoStock en lecture seule) — voir lib/faso-stock-sync.ts.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, fasoStockApiKey:faso_stock_api_key, fasoStockStoreMapping:faso_stock_store_mapping")
    .not("faso_stock_api_key", "is", null);

  if (error) {
    console.error("[cron/faso-stock-sync] Échec de la lecture des commerces :", error.message);
    return NextResponse.json({ error: "Échec de la lecture des commerces" }, { status: 500 });
  }

  const results: Array<{ businessId: string; success: boolean; detail: string }> = [];

  for (const business of businesses ?? []) {
    const businessId = business.id as string;
    const apiKey = business.fasoStockApiKey as string | null;
    if (!apiKey) continue;

    let mapping: FasoStockStoreMapping = {};
    try {
      mapping = business.fasoStockStoreMapping ? JSON.parse(business.fasoStockStoreMapping as string) : {};
    } catch {
      mapping = {};
    }

    const result = await runFasoStockSync(businessId, apiKey, mapping);

    await supabase
      .from("businesses")
      .update({
        faso_stock_last_sync_at: new Date().toISOString(),
        faso_stock_last_sync_status: result.success ? "OK" : "ERREUR",
        faso_stock_last_sync_error: result.success ? null : result.error,
      })
      .eq("id", businessId);

    results.push({
      businessId,
      success: result.success,
      detail: result.success
        ? `${result.productsCreated} créé(s), ${result.productsUpdated} mis à jour`
        : result.error,
    });
  }

  return NextResponse.json({ synced: results.length, results });
}

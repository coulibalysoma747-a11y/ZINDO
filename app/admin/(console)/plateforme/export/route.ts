import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/superadmin-auth";
import { supabase } from "@/lib/supabase";
import { logAdminAction } from "@/lib/admin-audit";

// Tables métier principales — pas un dump complet de la base (auquel on
// n'a pas accès direct, voir AGENTS.md/lib/supabase.ts) mais assez pour un
// export en cas de litige ou de migration. Les sauvegardes infrastructure
// restent gérées par Supabase.
const TABLES = [
  "businesses",
  "users",
  "products",
  "categories",
  "brands",
  "customers",
  "suppliers",
  "sales",
  "sale_items",
  "purchases",
  "purchase_items",
  "locations",
  "product_stocks",
  "stock_movements",
  "business_subscriptions",
  "subscription_invoices",
] as const;

export async function GET() {
  const admin = await requireFounder();

  const dump: Record<string, unknown> = { exportedAt: new Date().toISOString() };
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.error(`[export] Échec sur la table ${table} :`, error.message);
      dump[table] = { error: error.message };
      continue;
    }
    dump[table] = data ?? [];
  }

  // Ne jamais exporter les hachages de mot de passe.
  if (Array.isArray(dump.users)) {
    dump.users = (dump.users as Array<Record<string, unknown>>).map(({ password_hash: _passwordHash, ...rest }) => rest);
  }

  await logAdminAction({
    superAdminId: admin.id,
    actorName: admin.name,
    action: "EXPORT",
    entity: "PlatformData",
    details: `Export de ${TABLES.length} tables`,
  });

  const json = JSON.stringify(dump, null, 2);
  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="zindo-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

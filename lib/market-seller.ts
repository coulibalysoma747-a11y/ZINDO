import "server-only";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { type Permission } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { isMarketEnabledFor } from "@/lib/market-data";
import { countUnread } from "@/lib/market-messages";

/**
 * Accès à l'espace vendeur « Mon Marché » (flag nouveau_marche) : droits,
 * boutique du commerce et nombre de commandes à confirmer (badge des onglets).
 */
export async function requireMarketSeller(permission: Permission) {
  const user = await requirePermission(permission);
  if (!(await isMarketEnabledFor(user.businessId, user.business.activityKey))) redirect("/dashboard");
  const [{ data: shop }, { count }, unreadMessages] = await Promise.all([
    supabase.from("market_shops").select("id, slug, name, published, suspended, suspendedReason:suspended_reason, locationId:location_id").eq("business_id", user.businessId).maybeSingle(),
    supabase.from("market_orders").select("id", { count: "exact", head: true }).eq("business_id", user.businessId).eq("status", "RECUE"),
    countUnread({ businessId: user.businessId }),
  ]);
  return {
    user,
    shop: shop as { id: string; slug: string; name: string; published: boolean; suspended: boolean; suspendedReason: string | null; locationId: string | null } | null,
    newOrders: count ?? 0,
    unreadMessages,
  };
}

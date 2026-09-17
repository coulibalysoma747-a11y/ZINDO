"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { sendPushToBusiness } from "@/lib/push";
import type { NotificationType } from "@/lib/db-types";

// Types poussés en notification sur l'appareil, en plus de la liste en
// application — voir Paramètres. "Inventaire recommandé" reste uniquement
// dans la liste in-app (non demandé par le commerçant pour le push).
const PUSH_NOTIFICATION_TYPES: NotificationType[] = ["STOCK_FAIBLE", "RUPTURE_STOCK", "CREDIT_ECHU"];

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
};

const INVENTORY_STALE_DAYS = 60;

/**
 * Génère les notifications manquantes à partir de l'état actuel du commerce
 * (stock bas, rupture, inventaire à faire, crédits échus) — la table
 * `notifications` existe depuis la V1 mais rien ne l'alimentait jusqu'ici.
 * Idempotent : n'insère jamais deux fois la même alerte tant qu'elle n'a
 * pas été marquée lue (une ligne "link" identique et non lue fait déjà foi).
 */
async function syncNotifications(businessId: string) {
  const { data: existingUnread } = await supabase
    .from("notifications")
    .select("type, link")
    .eq("business_id", businessId)
    .eq("read", false);
  const existingKeys = new Set(
    ((existingUnread ?? []) as Array<{ type: string; link: string | null }>).map((n) => `${n.type}:${n.link ?? ""}`)
  );
  // Marque la clé comme prise immédiatement (et pas seulement après insertion
  // en base) pour ne jamais pousser deux fois la même alerte au sein d'un
  // même passage — ex. deux échéances en retard sur la même vente.
  function claim(type: NotificationType, link: string) {
    const key = `${type}:${link}`;
    if (existingKeys.has(key)) return false;
    existingKeys.add(key);
    return true;
  }

  const toInsert: Array<{ business_id: string; type: NotificationType; title: string; message: string; link: string | null }> = [];

  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, minStock:min_stock, stocks:product_stocks(quantity)")
    .eq("business_id", businessId)
    .eq("active", true);
  for (const p of (productsData ?? []) as unknown as Array<{ id: string; name: string; minStock: number; stocks: { quantity: number }[] }>) {
    const total = p.stocks.reduce((s, st) => s + st.quantity, 0);
    const link = `/produits/${p.id}`;
    if (total <= 0) {
      if (claim("RUPTURE_STOCK", link)) {
        toInsert.push({
          business_id: businessId,
          type: "RUPTURE_STOCK",
          title: "Produit en rupture",
          message: `${p.name} n'a plus de stock.`,
          link,
        });
      }
    } else if (total <= p.minStock) {
      if (claim("STOCK_FAIBLE", link)) {
        toInsert.push({
          business_id: businessId,
          type: "STOCK_FAIBLE",
          title: "Stock faible",
          message: `${p.name} : il ne reste que ${total} en stock (seuil : ${p.minStock}).`,
          link,
        });
      }
    }
  }

  const { data: plansData } = await supabase
    .from("installment_plans")
    .select("id, saleId:sale_id, customer:customers(name)")
    .eq("business_id", businessId);
  const plans = (plansData ?? []) as unknown as Array<{ id: string; saleId: string; customer: { name: string } | null }>;
  if (plans.length > 0) {
    const planMap = new Map(plans.map((p) => [p.id, p]));
    const { data: overdueInstallments } = await supabase
      .from("installments")
      .select("id, amount, paidAmount:paid_amount, planId:plan_id")
      .in("plan_id", [...planMap.keys()])
      .lt("due_date", new Date().toISOString().slice(0, 10));
    for (const i of (overdueInstallments ?? []) as unknown as Array<{ id: string; amount: number; paidAmount: number; planId: string }>) {
      if (i.paidAmount >= i.amount) continue;
      const plan = planMap.get(i.planId);
      if (!plan) continue;
      const link = `/ventes/${plan.saleId}`;
      if (claim("CREDIT_ECHU", link)) {
        toInsert.push({
          business_id: businessId,
          type: "CREDIT_ECHU",
          title: "Échéance de crédit dépassée",
          message: `${plan.customer?.name ?? "Un client"} a une échéance impayée de ${Math.round(i.amount - i.paidAmount)} FCFA.`,
          link,
        });
      }
    }
  }

  const inventoryLink = "/inventaire";
  if (claim("INVENTAIRE_NECESSAIRE", inventoryLink)) {
    const { data: lastInventory } = await supabase
      .from("inventories")
      .select("createdAt:created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastDate = lastInventory ? new Date(lastInventory.createdAt as string) : null;
    const staleMs = INVENTORY_STALE_DAYS * 24 * 60 * 60 * 1000;
    if (!lastDate || Date.now() - lastDate.getTime() > staleMs) {
      toInsert.push({
        business_id: businessId,
        type: "INVENTAIRE_NECESSAIRE",
        title: "Inventaire recommandé",
        message: lastDate
          ? `Le dernier inventaire remonte à plus de ${INVENTORY_STALE_DAYS} jours.`
          : "Aucun inventaire n'a encore été fait.",
        link: inventoryLink,
      });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("notifications").insert(toInsert);
    if (error) {
      console.error("[syncNotifications] Échec de l'insertion :", error.message);
    } else {
      await Promise.all(
        toInsert
          .filter((n) => PUSH_NOTIFICATION_TYPES.includes(n.type))
          .map((n) => sendPushToBusiness(businessId, { title: n.title, body: n.message, link: n.link ?? undefined }))
      );
    }
  }
}

export async function getNotificationsAction(): Promise<NotificationRow[]> {
  const user = await requirePermission(PERMISSIONS.STOCK_VIEW);
  await syncNotifications(user.businessId);

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, message, read, link, createdAt:created_at")
    .eq("business_id", user.businessId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as unknown as NotificationRow[];
}

export async function getUnreadNotificationCountAction(): Promise<number> {
  const user = await requirePermission(PERMISSIONS.STOCK_VIEW);
  await syncNotifications(user.businessId);

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("business_id", user.businessId)
    .eq("read", false);
  return count ?? 0;
}

export async function markNotificationReadAction(id: string) {
  const user = await requirePermission(PERMISSIONS.STOCK_VIEW);
  await supabase.from("notifications").update({ read: true }).eq("id", id).eq("business_id", user.businessId);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await requirePermission(PERMISSIONS.STOCK_VIEW);
  await supabase.from("notifications").update({ read: true }).eq("business_id", user.businessId).eq("read", false);
  revalidatePath("/notifications");
}

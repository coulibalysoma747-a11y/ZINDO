"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";

export type WipeScope = "products" | "sales" | "purchases" | "transfers" | "stock" | "movements";

const SCOPE_LABELS: Record<WipeScope, string> = {
  products: "Produits",
  sales: "Ventes",
  purchases: "Achats",
  transfers: "Transferts",
  stock: "Stock",
  movements: "Mouvements",
};

/**
 * "Vider historiques entreprise" (Paramètres > Zone de danger) : suppression
 * définitive et irréversible, réservée à un administrateur du commerce
 * ayant retapé le nom exact de l'entreprise (vérifié aussi côté serveur,
 * pas seulement dans le formulaire). locationId restreint l'effet à une
 * seule boutique quand fourni (sans effet pour "products", qui n'appartient
 * jamais à une boutique précise).
 */
export async function wipeBusinessDataAction(
  scope: WipeScope,
  confirmBusinessName: string,
  locationId?: string
): Promise<{ error?: string; success?: string }> {
  const user = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);

  if (confirmBusinessName.trim() !== user.business.name.trim()) {
    return { error: "Le nom saisi ne correspond pas exactement au nom de votre commerce" };
  }

  let error: { message: string } | null = null;

  switch (scope) {
    case "products": {
      const { error: e } = await supabase.from("products").delete().eq("business_id", user.businessId);
      error = e;
      break;
    }
    case "sales": {
      let q = supabase.from("sales").delete().eq("business_id", user.businessId);
      if (locationId) q = q.eq("location_id", locationId);
      const { error: e } = await q;
      error = e;
      break;
    }
    case "purchases": {
      let q = supabase.from("purchases").delete().eq("business_id", user.businessId);
      if (locationId) q = q.eq("location_id", locationId);
      const { error: e } = await q;
      error = e;
      break;
    }
    case "transfers": {
      const { error: e } = await supabase.from("stock_transfers").delete().eq("business_id", user.businessId);
      error = e;
      break;
    }
    case "stock": {
      const { data: locations } = await supabase.from("locations").select("id").eq("business_id", user.businessId);
      const locationIds = locationId ? [locationId] : (locations ?? []).map((l) => l.id as string);
      if (locationIds.length > 0) {
        const { error: e } = await supabase.from("product_stocks").update({ quantity: 0 }).in("location_id", locationIds);
        error = e;
      }
      break;
    }
    case "movements": {
      let q = supabase.from("stock_movements").delete().eq("business_id", user.businessId);
      if (locationId) q = q.eq("location_id", locationId);
      const { error: e } = await q;
      error = e;
      break;
    }
  }

  if (error) {
    console.error(`[wipeBusinessDataAction] Échec (${scope}) :`, error.message);
    const isForeignKeyError = /foreign key|violates/.test(error.message.toLowerCase());
    return {
      error: isForeignKeyError
        ? "Impossible : d'autres données font encore référence à celles-ci. Videz d'abord les ventes/achats/mouvements avant les produits."
        : "Impossible d'effectuer cette suppression",
    };
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "DELETE",
    entity: "DangerZone",
    details: `${SCOPE_LABELS[scope]}${locationId ? ` (boutique ${locationId})` : " (toute l'entreprise)"}`,
  });

  revalidatePath("/parametres");
  return { success: `${SCOPE_LABELS[scope]} vidé(s)` };
}

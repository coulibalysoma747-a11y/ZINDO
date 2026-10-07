"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { forget } from "@/lib/memo";
import { PERMISSIONS } from "@/lib/permissions";
import { requireMarketSeller } from "@/lib/market-seller";

/**
 * Portefeuille ZINDO du vendeur : les recharges se paient par SasPay (lib/actions/saspay.ts)
 * et le solde sert à l'achat instantané des mises en avant (fonction
 * market_buy_boost : prix, solde et débit vérifiés en base, en une opération).
 */

const boostSchema = z.object({
  kind: z.enum(["PRODUIT", "BOUTIQUE"]),
  targetId: z.string().min(1, "Choisissez ce que vous mettez en avant"),
  days: z.number().int().positive(),
});

const BOOST_ERRORS: Record<string, string> = {
  SOLDE_INSUFFISANT: "Solde insuffisant : rechargez votre portefeuille.",
  TARIF_INTROUVABLE: "Cette durée n'est plus proposée.",
  CIBLE_INTROUVABLE: "Ce produit ou cette boutique n'est pas publié sur le Marché.",
};

/** Achète une mise en avant, payée instantanément depuis le portefeuille. */
export async function buyBoostAction(input: z.infer<typeof boostSchema>): Promise<{ error?: string; success?: string }> {
  const { user } = await requireMarketSeller(PERMISSIONS.SETTINGS_MANAGE);
  const parsed = boostSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Choix invalide" };
  const d = parsed.data;

  const { data: endsAt, error } = await supabase.rpc("market_buy_boost", { p_business: user.businessId, p_kind: d.kind, p_target: d.targetId, p_days: d.days });
  if (error) {
    const known = Object.keys(BOOST_ERRORS).find((k) => error.message.includes(k));
    if (!known) console.error("[buyBoostAction]", error.message);
    return { error: known ? BOOST_ERRORS[known] : "Achat impossible, réessayez." };
  }
  await logAction({ businessId: user.businessId, userId: user.id, action: "CREATE", entity: "market_boost", entityId: d.targetId, details: `Mise en avant ${d.kind} ${d.days} j` });
  revalidatePath("/mon-marche/visibilite");
  revalidatePath("/marche", "layout");
  forget("marche:");
  const until = new Date(endsAt as string).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return { success: `Mise en avant active jusqu'au ${until}.` };
}

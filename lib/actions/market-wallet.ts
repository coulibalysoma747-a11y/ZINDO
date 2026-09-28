"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/permissions";
import { requireMarketSeller } from "@/lib/market-seller";

/**
 * Portefeuille ZINDO du vendeur : recharges (Mobile Money vers ZINDO, validées
 * une fois dans l'admin) et achat instantané des mises en avant (fonction
 * market_buy_boost : prix, solde et débit vérifiés en base, en une opération).
 */

export type WalletState = { error?: string; success?: string } | undefined;

const topupSchema = z.object({
  amount: z.coerce.number().int("Montant en FCFA, sans centimes").min(100, "100 FCFA minimum").max(10_000_000),
  operator: z.enum(["ORANGE", "MOOV"], { message: "Choisissez l'opérateur" }),
  reference: z.string().trim().min(4, "Indiquez la référence du transfert").max(80),
});

export async function submitTopupAction(_prev: WalletState, formData: FormData): Promise<WalletState> {
  const { user } = await requireMarketSeller(PERMISSIONS.SETTINGS_MANAGE);
  const parsed = topupSchema.safeParse({
    amount: String(formData.get("amount") ?? "").replace(/\s/g, ""),
    operator: formData.get("operator"),
    reference: formData.get("reference"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const d = parsed.data;

  const { error } = await supabase.from("market_topups").insert({ business_id: user.businessId, amount: d.amount, operator: d.operator, reference: d.reference });
  if (error) {
    if (error.code === "23505") return { error: "Cette référence de transfert a déjà été déclarée." };
    console.error("[submitTopupAction]", error.message);
    return { error: "Envoi impossible, réessayez." };
  }
  await logAction({ businessId: user.businessId, userId: user.id, action: "CREATE", entity: "market_topup", details: `Recharge ${d.amount} FCFA (${d.operator}, réf. ${d.reference})` });
  revalidatePath("/mon-marche/visibilite");
  return { success: "Recharge envoyée : votre solde sera crédité dès que ZINDO aura vérifié le transfert." };
}

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
  const until = new Date(endsAt as string).toLocaleDateString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return { success: `Mise en avant active jusqu'au ${until}.` };
}

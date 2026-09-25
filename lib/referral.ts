import "server-only";
import { randomInt } from "crypto";
import { supabase } from "@/lib/supabase";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";

/**
 * Parrainage : chaque commerce a un code (ex. SOMA7K) diffusé dans le QR
 * code "Créé avec ZINDO" de ses documents et par WhatsApp. Le filleul qui
 * s'inscrit avec ce code a un essai prolongé ; le parrain gagne un mois de
 * Pro quand le filleul paie son premier abonnement.
 *
 * Nouvelle fonctionnalité, désactivée par défaut (voir lib/feature-flags.ts) :
 * le flag est vérifié sur le commerce PARRAIN.
 */
const REFERRAL_FLAG = "parrainage";

export const ZINDO_SITE = "zindo.site";
export const ZINDO_WHATSAPP = "04 05 99 29";
export const REFERRAL_TRIAL_DAYS = 30;
export const REFERRAL_REWARD_MONTHS = 1;
export const REFERRAL_MAX_MONTHS_PER_YEAR = 12;
export const REFERRAL_COOKIE = "zindo_ref";

export const REFERRAL_SOURCES: Record<string, string> = {
  bon_commande: "Bon de commande",
  demande_prix: "Demande de prix",
  facture: "Facture",
  ticket: "Ticket",
  whatsapp: "WhatsApp",
  lien: "Lien partagé",
  manuel: "Code saisi à l'inscription",
};

export async function ensureReferralFlagRegistered() {
  await registerFeatureFlag(
    REFERRAL_FLAG,
    "Parrainage",
    "Code et QR code de parrainage sur les documents, essai prolongé pour le filleul et 1 mois de Pro offert au parrain au premier paiement du filleul."
  );
}

export async function isReferralModuleEnabled(businessId: string): Promise<boolean> {
  await ensureReferralFlagRegistered();
  return isFeatureEnabled(REFERRAL_FLAG, businessId);
}

// Sans O/0/I/1/L, pour un code facile à dicter au téléphone.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function buildCode(businessName: string) {
  const letters = businessName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .replace(/[OIL]/g, "")
    .slice(0, 4);
  let code = letters;
  while (code.length < 6) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

export function normalizeReferralCode(code: string | null | undefined) {
  const c = (code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return c.length >= 4 && c.length <= 12 ? c : null;
}

/** Code du commerce, généré à la première demande. */
export async function ensureReferralCode(businessId: string): Promise<string | null> {
  const { data } = await supabase.from("businesses").select("name, referralCode:referral_code").eq("id", businessId).maybeSingle();
  if (!data) return null;
  if (data.referralCode) return data.referralCode as string;
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = buildCode(attempt < 3 ? (data.name as string) : "");
    const { error } = await supabase.from("businesses").update({ referral_code: code }).eq("id", businessId).is("referral_code", null);
    if (!error) {
      const { data: fresh } = await supabase.from("businesses").select("referralCode:referral_code").eq("id", businessId).maybeSingle();
      return (fresh?.referralCode as string) ?? code;
    }
    // Conflit d'unicité : autre code au prochain essai.
  }
  return null;
}

export function referralUrl(code: string, source?: string) {
  return `https://${ZINDO_SITE}/r/${code}${source ? `?s=${source}` : ""}`;
}

function phoneDigits(phone: string | null | undefined) {
  return (phone ?? "").replace(/\D/g, "").slice(-8);
}

/**
 * Rattache un commerce qui vient de s'inscrire à son parrain. Refusé en
 * silence (l'inscription n'échoue jamais pour ça) si le code est inconnu, si
 * le module est désactivé chez le parrain, ou si c'est un auto-parrainage
 * (même numéro que le commerce ou un utilisateur du parrain).
 */
export async function attachReferral(params: {
  referredBusinessId: string;
  referredPhone: string;
  code: string | null | undefined;
  source?: string | null;
}) {
  try {
    const code = normalizeReferralCode(params.code);
    if (!code) return;
    const { data: referrer } = await supabase
      .from("businesses")
      .select("id, phone")
      .eq("referral_code", code)
      .maybeSingle();
    if (!referrer || referrer.id === params.referredBusinessId) return;
    if (!(await isReferralModuleEnabled(referrer.id as string))) return;

    const newPhone = phoneDigits(params.referredPhone);
    const { data: referrerUsers } = await supabase.from("users").select("phone").eq("business_id", referrer.id);
    const referrerPhones = new Set([phoneDigits(referrer.phone as string), ...(referrerUsers ?? []).map((u) => phoneDigits(u.phone as string))]);
    if (newPhone && referrerPhones.has(newPhone)) return;

    const source = params.source && REFERRAL_SOURCES[params.source] ? params.source : "manuel";
    const { error } = await supabase.from("referrals").insert({
      referrer_business_id: referrer.id,
      referred_business_id: params.referredBusinessId,
      code,
      source,
    });
    if (error) {
      console.error("[attachReferral] Échec de l'enregistrement :", error.message);
      return;
    }

    // Avantage filleul : essai prolongé.
    await supabase
      .from("business_subscriptions")
      .update({ trial_ends_at: new Date(Date.now() + REFERRAL_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString() })
      .eq("business_id", params.referredBusinessId)
      .eq("status", "TRIAL");
  } catch (e) {
    console.error("[attachReferral] Erreur inattendue :", e);
  }
}

function addMonths(from: Date, months: number) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Premier paiement d'un filleul : le parrain gagne 1 mois de Pro, ajouté au
 * bout de son abonnement (ou de son essai). Idempotent, plafonné à 12 mois
 * offerts par an.
 */
export async function rewardReferrerOnFirstPayment(referredBusinessId: string) {
  try {
    const { data: referral } = await supabase
      .from("referrals")
      .select("id, referrerId:referrer_business_id, status")
      .eq("referred_business_id", referredBusinessId)
      .maybeSingle();
    if (!referral || referral.status !== "INSCRIT") return;

    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("referrals")
      .select("rewardMonths:reward_months")
      .eq("referrer_business_id", referral.referrerId)
      .eq("status", "VALIDE")
      .gte("rewarded_at", yearAgo);
    const monthsThisYear = (recent ?? []).reduce((s, r) => s + ((r.rewardMonths as number) ?? 0), 0);
    const months = monthsThisYear + REFERRAL_REWARD_MONTHS <= REFERRAL_MAX_MONTHS_PER_YEAR ? REFERRAL_REWARD_MONTHS : 0;

    // Validation d'abord (garde contre un double traitement : seule la ligne
    // encore INSCRIT passe à VALIDE).
    const { data: claimed } = await supabase
      .from("referrals")
      .update({ status: "VALIDE", reward_months: months, rewarded_at: new Date().toISOString() })
      .eq("id", referral.id)
      .eq("status", "INSCRIT")
      .select("id");
    if (!claimed || claimed.length === 0 || months === 0) return;

    await extendSubscription(referral.referrerId as string, months);
  } catch (e) {
    console.error("[rewardReferrerOnFirstPayment] Erreur inattendue :", e);
  }
}

export async function extendSubscription(businessId: string, months: number) {
  const { data: sub } = await supabase
    .from("business_subscriptions")
    .select("status, trialEndsAt:trial_ends_at, currentPeriodEnd:current_period_end")
    .eq("business_id", businessId)
    .maybeSingle();
  if (!sub) return;
  const now = new Date();
  if (months < 0) {
    // Retrait d'une récompense annulée : on recule la date de fin telle quelle.
    const field = sub.status === "TRIAL" ? "trial_ends_at" : "current_period_end";
    const end = (sub.status === "TRIAL" ? sub.trialEndsAt : sub.currentPeriodEnd) as string | null;
    if (end) await supabase.from("business_subscriptions").update({ [field]: addMonths(new Date(end), months).toISOString() }).eq("business_id", businessId);
    return;
  }
  if (sub.status === "TRIAL") {
    const base = sub.trialEndsAt && new Date(sub.trialEndsAt as string) > now ? new Date(sub.trialEndsAt as string) : now;
    await supabase.from("business_subscriptions").update({ trial_ends_at: addMonths(base, months).toISOString() }).eq("business_id", businessId);
    return;
  }
  const base = sub.currentPeriodEnd && new Date(sub.currentPeriodEnd as string) > now ? new Date(sub.currentPeriodEnd as string) : now;
  await supabase
    .from("business_subscriptions")
    .update({ status: "ACTIVE", current_period_end: addMonths(base, months).toISOString() })
    .eq("business_id", businessId);
}

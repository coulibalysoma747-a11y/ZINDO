"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { createBuyerSession, destroyBuyerSession, getCurrentBuyer } from "@/lib/market-buyer";
import { normalizeBuyerPhone, safeMarketRedirect } from "@/lib/market";
import { isCountryCode } from "@/lib/countries";

/** Comptes acheteurs du Marché (compte léger, sans gestion commerciale). */

export type BuyerAuthState = { error?: string } | undefined;

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

const signupSchema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(80),
  phone: z.string().trim().min(8, "Numéro de téléphone invalide"),
  password: z.string().min(6, "Mot de passe : 6 caractères minimum").max(100),
  kind: z.enum(["PARTICULIER", "PRO"]),
  companyName: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  countryCode: z.string().refine(isCountryCode, "Choisissez votre pays"),
});

export async function signupBuyerAction(_prev: BuyerAuthState, formData: FormData): Promise<BuyerAuthState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    kind: formData.get("kind") === "PRO" ? "PRO" : "PARTICULIER",
    companyName: (formData.get("companyName") as string) || undefined,
    city: (formData.get("city") as string) || undefined,
    countryCode: formData.get("countryCode"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const d = parsed.data;
  if (d.kind === "PRO" && !d.companyName) return { error: "Indiquez le nom de l'entreprise." };

  const phone = normalizeBuyerPhone(d.phone);
  if (!phone) return { error: "Numéro de téléphone invalide" };
  const { data: existing } = await supabase.from("market_buyers").select("id").eq("phone", phone).maybeSingle();
  if (existing) return { error: "Un compte existe déjà avec ce numéro : connectez-vous." };

  const { data: buyer, error } = await supabase
    .from("market_buyers")
    .insert({
      name: d.name,
      phone,
      password_hash: await bcrypt.hash(d.password, 10),
      kind: d.kind,
      company_name: d.kind === "PRO" ? d.companyName : null,
      city: d.city ?? null,
      country_code: d.countryCode,
      last_login_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !buyer) {
    console.error("[signupBuyerAction]", error?.message);
    return { error: "Création du compte impossible, réessayez." };
  }
  await createBuyerSession(buyer.id);
  redirect(safeMarketRedirect(formData.get("suite")));
}

export async function loginBuyerAction(_prev: BuyerAuthState, formData: FormData): Promise<BuyerAuthState> {
  const phone = normalizeBuyerPhone(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!phone || !password) return { error: "Numéro ou mot de passe incorrect." };

  const { data: buyer } = await supabase
    .from("market_buyers")
    .select("id, passwordHash:password_hash, blocked, failedLogins:failed_logins, lockedUntil:locked_until")
    .eq("phone", phone)
    .maybeSingle();
  if (!buyer) return { error: "Numéro ou mot de passe incorrect." };
  if (buyer.blocked) return { error: "Ce compte a été bloqué. Contactez ZINDO au 04 05 99 29." };
  if (buyer.lockedUntil && new Date(buyer.lockedUntil).getTime() > Date.now()) {
    return { error: `Trop d'essais : réessayez dans ${LOCK_MINUTES} minutes.` };
  }

  if (!(await bcrypt.compare(password, buyer.passwordHash))) {
    const failed = (buyer.failedLogins ?? 0) + 1;
    await supabase
      .from("market_buyers")
      .update({
        failed_logins: failed >= MAX_FAILED_LOGINS ? 0 : failed,
        locked_until: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      })
      .eq("id", buyer.id);
    return { error: "Numéro ou mot de passe incorrect." };
  }

  await supabase
    .from("market_buyers")
    .update({ failed_logins: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq("id", buyer.id);
  await createBuyerSession(buyer.id);
  redirect(safeMarketRedirect(formData.get("suite")));
}

export async function logoutBuyerAction() {
  await destroyBuyerSession();
  redirect("/marche");
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(80),
  companyName: z.string().trim().max(120).optional(),
  countryCode: z.string().refine(isCountryCode, "Choisissez votre pays"),
  city: z.string().trim().max(80).optional(),
});

export type BuyerProfileState = { error?: string; success?: string } | undefined;

/** L'acheteur met à jour ses informations (nom, entreprise, pays, ville). */
export async function updateBuyerProfileAction(_prev: BuyerProfileState, formData: FormData): Promise<BuyerProfileState> {
  const buyer = await getCurrentBuyer();
  if (!buyer) return { error: "Connectez-vous." };
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    companyName: (formData.get("companyName") as string) || undefined,
    countryCode: formData.get("countryCode"),
    city: (formData.get("city") as string) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const d = parsed.data;
  if (buyer.kind === "PRO" && !d.companyName) return { error: "Indiquez le nom de l'entreprise." };
  const { error } = await supabase
    .from("market_buyers")
    .update({ name: d.name, company_name: buyer.kind === "PRO" ? d.companyName : null, country_code: d.countryCode, city: d.city ?? null })
    .eq("id", buyer.id);
  if (error) return { error: "Enregistrement impossible, réessayez." };
  revalidatePath("/marche/compte");
  return { success: "Vos informations sont enregistrées." };
}

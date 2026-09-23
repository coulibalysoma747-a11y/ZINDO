"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createSession } from "@/lib/session";
import { isFeatureEnabledGlobally } from "@/lib/feature-flags";
import { countryNameFr } from "@/lib/countries";
import { logAction } from "@/lib/audit";
import { ACTIVE_PLAN_KEY } from "@/lib/subscription";
import type { Role } from "@/lib/db-types";

/**
 * Inscription « vendeur du Marché ZINDO » : pour quelqu'un sans boutique qui
 * veut juste mettre des produits en vente sur /marche. Crée en une fois :
 * le compte + commerce (même RPC que l'inscription normale), une boutique en
 * ligne déjà publiée, le module boutique en ligne activé pour ce commerce, et
 * un accès gratuit illimité (abonnement ACTIVE sans échéance réelle).
 */

const schema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis"),
  lastName: z.string().trim().min(1, "Nom requis"),
  phone: z.string().trim().min(8, "Numéro de téléphone invalide"),
  password: z.string().min(6, "Mot de passe : 6 caractères minimum"),
  sellerName: z.string().trim().optional(),
  city: z.string().trim().min(1, "Ville requise"),
});

export type MarketSellerState = { error?: string } | undefined;

// Accès « gratuit illimité » : période payée qui court jusqu'en 2099.
const FREE_FOREVER_END = "2099-12-31T23:59:59Z";

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "vendeur"
  );
}

async function uniqueSlug(base: string) {
  for (let i = 0; i < 6; i++) {
    const slug = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data } = await supabase.from("online_stores").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function registerMarketSellerAction(
  _prev: MarketSellerState,
  formData: FormData
): Promise<MarketSellerState> {
  if (!(await isFeatureEnabledGlobally("marche_zindo"))) return { error: "Le Marché ZINDO n'est pas encore ouvert." };
  if (formData.get("acceptTerms") !== "on") return { error: "Vous devez accepter les conditions d'utilisation." };

  const parsed = schema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    sellerName: formData.get("sellerName") || undefined,
    city: formData.get("city"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const { firstName, lastName, phone, password, sellerName, city } = parsed.data;

  const { data: existing } = await supabase.from("users").select("id").eq("phone", phone).maybeSingle();
  if (existing) return { error: "Ce numéro a déjà un compte ZINDO : connectez-vous." };

  const displayName = sellerName || `${firstName} ${lastName}`;
  const { data, error } = await supabase.rpc("register_business", {
    p_business_name: displayName,
    p_city: city,
    p_country: countryNameFr("BF"),
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
    p_email: "",
    p_password_hash: await bcrypt.hash(password, 10),
  });
  if (error || !data || data.length === 0) {
    console.error("[registerMarketSellerAction] Échec register_business :", error?.message);
    return { error: "Impossible de créer le compte. Réessayez." };
  }
  const row = data[0] as { user_id: string; business_id: string; role: string };
  const businessId = row.business_id;

  // Activité par défaut : évite le passage par /choisir-activite.
  await supabase
    .from("businesses")
    .update({ activity_key: "boutique_generale", activity: "Vendeur Marché ZINDO" })
    .eq("id", businessId);

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("business_id", businessId)
    .limit(1)
    .maybeSingle();

  const { error: storeError } = await supabase.from("online_stores").insert({
    business_id: businessId,
    slug: await uniqueSlug(slugify(displayName)),
    store_name: displayName,
    contact_phone: phone,
    whatsapp_number: phone,
    city,
    location_id: location?.id ?? null,
    delivery_enabled: false,
    delivery_fee: 0,
    pickup_enabled: true,
    pay_on_delivery_enabled: true,
    mobile_money_enabled: false,
    min_order_amount: 0,
    show_out_of_stock: false,
    published: true,
  });
  if (storeError) console.error("[registerMarketSellerAction] Échec boutique en ligne :", storeError.message);

  // Boutique en ligne + présence sur le marché : activées pour ce commerce seulement.
  for (const key of ["boutique_en_ligne", "marche_listing"]) {
    const { data: flag } = await supabase.from("feature_flags").select("id").eq("key", key).maybeSingle();
    if (!flag) continue;
    await supabase
      .from("feature_flag_businesses")
      .upsert(
        { feature_flag_id: flag.id, business_id: businessId, enabled: true },
        { onConflict: "feature_flag_id,business_id", ignoreDuplicates: false }
      );
  }

  const { data: plan } = await supabase.from("subscription_plans").select("id").eq("key", ACTIVE_PLAN_KEY).maybeSingle();
  if (plan) {
    const subscription = {
      plan_id: plan.id,
      billing_cycle: "ANNUAL",
      status: "ACTIVE",
      trial_ends_at: null,
      current_period_end: FREE_FOREVER_END,
    };
    const { data: sub } = await supabase.from("business_subscriptions").select("business_id").eq("business_id", businessId).maybeSingle();
    const { error: subError } = sub
      ? await supabase.from("business_subscriptions").update(subscription).eq("business_id", businessId)
      : await supabase.from("business_subscriptions").insert({ business_id: businessId, ...subscription });
    if (subError) console.error("[registerMarketSellerAction] Échec accès gratuit :", subError.message);
  }

  await logAction({
    businessId,
    userId: row.user_id,
    action: "CREATE",
    entity: "MarketSeller",
    details: "Inscription vendeur Marché ZINDO",
  });

  await createSession({ userId: row.user_id, businessId, role: row.role as Role });
  redirect("/produits/nouveau");
}

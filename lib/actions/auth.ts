"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createSession, destroySession } from "@/lib/session";
import type { Role } from "@/lib/db-types";

export type ActionState = { error?: string } | undefined;

const loginSchema = z.object({
  identifier: z.string().min(3, "Renseignez votre téléphone ou e-mail"),
  password: z.string().min(1, "Mot de passe requis"),
});

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }
  const { identifier, password } = parsed.data;
  const trimmedIdentifier = identifier.trim();
  // L'email est comparé sans tenir compte de la casse (ex. clavier mobile qui
  // met une majuscule automatique au premier caractère) — le téléphone reste
  // en comparaison exacte. `%`/`_` sont échappés pour ne pas être interprétés
  // comme des jokers ILIKE.
  const emailPattern = trimmedIdentifier.replace(/[%_\\]/g, (m) => `\\${m}`);

  const { data: user, error } = await supabase
    .from("users")
    .select("id, businessId:business_id, role, active, passwordHash:password_hash")
    .or(`phone.eq.${trimmedIdentifier},email.ilike.${emailPattern}`)
    .maybeSingle();

  if (error) {
    // Erreur backend (config Supabase, réseau...) distincte d'un simple
    // mauvais identifiant — journalisée côté serveur pour le diagnostic,
    // sans détail exposé au client.
    console.error("[loginAction] Échec de la requête Supabase :", error.message);
  }

  if (!user || !user.active) {
    return { error: "Identifiants incorrects" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash as string);
  if (!valid) {
    return { error: "Identifiants incorrects" };
  }

  await createSession({
    userId: user.id as string,
    businessId: user.businessId as string,
    role: user.role as string,
  });

  redirect("/dashboard");
}

const registerSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  phone: z.string().min(6, "Numéro de téléphone invalide"),
  email: z.string().email("E-mail invalide").optional().or(z.literal("")),
  password: z.string().min(6, "6 caractères minimum"),
  businessName: z.string().min(1, "Nom du commerce requis"),
  city: z.string().optional(),
});

export async function registerAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    password: formData.get("password"),
    businessName: formData.get("businessName"),
    city: formData.get("city") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const { firstName, lastName, phone, email, password, businessName, city } = parsed.data;

  const { data: existing } = await supabase.from("users").select("id").eq("phone", phone).maybeSingle();
  if (existing) {
    return { error: "Ce numéro de téléphone est déjà utilisé" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase.rpc("register_business", {
    p_business_name: businessName,
    p_city: city ?? null,
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
    p_email: email ?? "",
    p_password_hash: passwordHash,
  });

  if (error || !data || data.length === 0) {
    return { error: "Impossible de créer le compte. Réessayez." };
  }

  const row = data[0] as { user_id: string; business_id: string; role: string };
  await createSession({ userId: row.user_id, businessId: row.business_id, role: row.role as Role });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

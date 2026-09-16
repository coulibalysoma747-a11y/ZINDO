"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createSession, destroySession } from "@/lib/session";
import { createAdminSession } from "@/lib/adminSession";
import type { Role } from "@/lib/db-types";

export type ActionState = { error?: string } | undefined;

// Messages traduits pour les deux seules pages actuellement disponibles en
// anglais (voir app/en/login, app/en/inscription) — un champ caché "locale"
// dans chaque formulaire indique laquelle utiliser ; "fr" par défaut sinon.
// Les messages de validation zod ci-dessous (champ vide/trop court) restent
// en français : ils ne se déclenchent qu'en contournant l'attribut HTML
// "required" des champs, un cas marginal non couvert par cette première
// passe de traduction.
const AUTH_MESSAGES = {
  fr: {
    invalidFields: "Champs invalides",
    wrongCredentials: "Identifiants incorrects",
    mustAcceptTerms: "Vous devez accepter les CGU et la politique de confidentialité",
    phoneAlreadyUsed: "Ce numéro de téléphone est déjà utilisé",
    createAccountFailed: "Impossible de créer le compte. Réessayez.",
  },
  en: {
    invalidFields: "Invalid fields",
    wrongCredentials: "Incorrect login details",
    mustAcceptTerms: "You must accept the Terms of Service and Privacy Policy",
    phoneAlreadyUsed: "This phone number is already in use",
    createAccountFailed: "Could not create the account. Please try again.",
  },
} as const;

function getAuthLocale(formData: FormData): keyof typeof AUTH_MESSAGES {
  return formData.get("locale") === "en" ? "en" : "fr";
}

const loginSchema = z.object({
  identifier: z.string().min(3, "Renseignez votre téléphone ou e-mail"),
  password: z.string().min(1, "Mot de passe requis"),
});

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const t = AUTH_MESSAGES[getAuthLocale(formData)];
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.invalidFields };
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

  if (user && user.active) {
    const valid = await bcrypt.compare(password, user.passwordHash as string);
    if (valid) {
      await createSession({
        userId: user.id as string,
        businessId: user.businessId as string,
        role: user.role as string,
      });
      redirect("/dashboard");
    }
  }

  // Aucun compte commerçant correspondant (ou mot de passe invalide) : on
  // tente le compte propriétaire de la plateforme, pour que le créateur
  // puisse se connecter depuis ce même formulaire sans passer par /admin/login.
  const { data: admin } = await supabase
    .from("super_admins")
    .select("id, passwordHash:password_hash")
    .ilike("email", emailPattern)
    .maybeSingle();

  if (admin) {
    const validAdmin = await bcrypt.compare(password, admin.passwordHash as string);
    if (validAdmin) {
      await createAdminSession({ adminId: admin.id as string });
      redirect("/admin");
    }
  }

  return { error: t.wrongCredentials };
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
  const t = AUTH_MESSAGES[getAuthLocale(formData)];
  if (formData.get("acceptTerms") !== "on") {
    return { error: t.mustAcceptTerms };
  }

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
    return { error: parsed.error.issues[0]?.message ?? t.invalidFields };
  }

  const { firstName, lastName, phone, email, password, businessName, city } = parsed.data;

  const { data: existing } = await supabase.from("users").select("id").eq("phone", phone).maybeSingle();
  if (existing) {
    return { error: t.phoneAlreadyUsed };
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
    return { error: t.createAccountFailed };
  }

  const row = data[0] as { user_id: string; business_id: string; role: string };
  await createSession({ userId: row.user_id, businessId: row.business_id, role: row.role as Role });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

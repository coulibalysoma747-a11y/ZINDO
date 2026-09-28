"use server";

import { supabase } from "@/lib/supabase";
import { isFeatureEnabledGlobally } from "@/lib/feature-flags";

// Inscription publique à la newsletter depuis le pied de page de l'accueil.
// `website` est un champ piège invisible : rempli, c'est un robot.
export async function subscribeNewsletter(
  email: string,
  website: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isFeatureEnabledGlobally("pied_page_complet"))) {
    return { ok: false, error: "Inscription indisponible pour le moment." };
  }
  if (website) return { ok: true };
  const clean = email.trim().toLowerCase();
  if (clean.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return { ok: false, error: "Adresse e-mail invalide." };
  }
  const { error } = await supabase
    .from("newsletter_subscribers")
    .upsert({ email: clean }, { onConflict: "email", ignoreDuplicates: true });
  if (error) return { ok: false, error: "Inscription impossible, réessayez plus tard." };
  return { ok: true };
}

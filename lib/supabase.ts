import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client volontairement non typé par schéma généré : sans `Database` généré
// (on n'utilise pas `supabase gen types`), le typage automatique de
// `.select("colA, alias:col_b, rel(...)")` par la librairie produit des types
// incohérents (`never` / `GenericStringError`) plutôt que de se rabattre sur
// `any`. On caste donc le client une seule fois ici ; chaque appelant type
// le résultat de sa requête explicitement (voir lib/auth.ts pour l'exemple).
type SupabaseAdminClient = SupabaseClient<any, any, any>;

const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseAdminClient | undefined;
};

function createSupabaseClient(): SupabaseAdminClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");
  return createClient(url, key, { auth: { persistSession: false } }) as SupabaseAdminClient;
}

// Client admin (clé service_role) : utilisé par tout le code serveur pour
// requêter la base directement, en contournant les policies RLS — les
// autorisations sont vérifiées par l'application elle-même (lib/auth.ts),
// pas par Postgres.
export const supabase = globalForSupabase.supabase ?? createSupabaseClient();

if (process.env.NODE_ENV !== "production") globalForSupabase.supabase = supabase;

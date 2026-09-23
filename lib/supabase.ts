import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isDesktopBuild } from "@/lib/offline/auth-cache";

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

function createServiceRoleClient(): SupabaseAdminClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");
  return createClient(url, key, { auth: { persistSession: false } }) as SupabaseAdminClient;
}

function createDesktopScopedClient(accessToken: string): SupabaseAdminClient {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL manquant");
  // Pas de clé service_role ici : `accessToken` est un JWT à courte durée de
  // vie, signé par app/api/desktop/login/route.ts (SUPABASE_JWT_SECRET,
  // jamais embarqué dans l'app Windows), portant le rôle Postgres
  // "authenticated" et le commerce du commerçant connecté. L'isolation entre
  // commerces est appliquée par les policies RLS ajoutées dans
  // supabase/migrations/2026-09-23_rls_desktop_scoped_access.sql — pas ici.
  return createClient(url, accessToken, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  }) as SupabaseAdminClient;
}

// Jeton scoped courant de l'app Windows — un seul commerce est connecté à la
// fois sur une installation desktop donnée (voir electron/main.ts : un seul
// processus serveur local par installation), donc une simple variable de
// module suffit ; pas besoin d'un contexte par requête (AsyncLocalStorage).
let desktopClient: SupabaseAdminClient | null = null;

export function setDesktopSupabaseClient(accessToken: string): void {
  desktopClient = createDesktopScopedClient(accessToken);
}

export function clearDesktopSupabaseClient(): void {
  desktopClient = null;
}

function resolveClient(): SupabaseAdminClient {
  if (!isDesktopBuild()) {
    if (!globalForSupabase.supabase) globalForSupabase.supabase = createServiceRoleClient();
    return globalForSupabase.supabase;
  }
  if (!desktopClient) {
    throw new Error(
      "Aucune session Supabase active côté application Windows (pas encore connecté, ou jeton expiré — voir setDesktopSupabaseClient)."
    );
  }
  return desktopClient;
}

// Proxy plutôt qu'un export mutable classique : ~190 fichiers font
// `import { supabase } from "@/lib/supabase"` puis `supabase.from(...)`
// directement — ce Proxy leur laisse ce code strictement inchangé, tout en
// résolvant dynamiquement, à chaque appel, le bon client selon le contexte
// (service_role sur le web, jeton scoped courant sur l'app Windows).
export const supabase: SupabaseAdminClient = new Proxy({} as SupabaseAdminClient, {
  get(_target, prop, _receiver) {
    const client = resolveClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

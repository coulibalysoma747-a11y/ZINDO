import "server-only";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Authentifie une requête de app/api/v1/* via `Authorization: Bearer <clé>` —
 * voir Paramètres > "Intégrations API" pour l'émission des clés. Ne renvoie
 * que le business_id : l'API v1 est volontairement en lecture seule, aucune
 * notion de rôle/permission à vérifier côté clé.
 */
export async function authenticateApiKey(request: Request): Promise<{ businessId: string } | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const key = match[1].trim();
  if (!key) return null;

  const keyHash = hashApiKey(key);
  const { data } = await supabase
    .from("api_keys")
    .select("id, businessId:business_id, revokedAt:revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();
  if (!data || data.revokedAt) return null;

  // Awaitée pour ne pas laisser une promesse en vol qu'un environnement
  // serverless pourrait interrompre — son résultat n'est pas vérifié, une
  // erreur ici ne doit jamais faire échouer la requête API elle-même.
  await supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id as string);

  return { businessId: data.businessId as string };
}

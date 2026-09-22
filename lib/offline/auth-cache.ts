import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CurrentUser } from "@/lib/auth";

/**
 * Repli hors-ligne pour l'authentification, utilisé UNIQUEMENT dans
 * l'application Windows (ZINDO_DESKTOP_BUILD=1, défini par electron/main.ts)
 * — jamais sur le déploiement web, où une panne réseau vers Supabase doit
 * continuer à échouer normalement. Le process serveur (Next.js standalone
 * lancé par Electron) écrit ce cache à chaque résolution réussie de session,
 * et s'y replie si Supabase est injoignable.
 *
 * Ce n'est PAS un stockage de secrets : uniquement les données déjà vues par
 * cet utilisateur lors de sa dernière connexion réussie.
 */

export function isDesktopBuild(): boolean {
  return process.env.ZINDO_DESKTOP_BUILD === "1";
}

/**
 * Heuristique réseau vs erreur applicative : une requête Supabase qui aboutit
 * (même "aucune ligne trouvée" via maybeSingle) renvoie soit une donnée, soit
 * `error: null`. Un `error` non nul ici vient donc soit d'un problème de
 * schéma (déjà géré par les fallback existants comme USER_SELECT_FALLBACK),
 * soit d'une requête qui n'a jamais atteint le serveur — undici (fetch de
 * Node) signale ce cas par un message contenant "fetch failed" et un `cause`
 * de type ENOTFOUND/ECONNREFUSED/ETIMEDOUT, sans `code` Postgrest (les
 * erreurs Postgrest ont toujours un `code`, ex. "PGRST116", "23505"...).
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: unknown; message?: unknown };
  if (typeof err.code === "string" && err.code.length > 0) return false;
  const message = typeof err.message === "string" ? err.message.toLowerCase() : "";
  return (
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("enotfound") ||
    message.includes("econnrefused") ||
    message.includes("etimedout") ||
    message.includes("timeout")
  );
}

function cacheDir(): string | null {
  const dir = process.env.ZINDO_LOCAL_CACHE_DIR;
  return dir ? dir : null;
}

function cacheFilePath(userId: string): string | null {
  const dir = cacheDir();
  if (!dir) return null;
  return path.join(dir, "auth-cache", `${userId}.json`);
}

export type CachedResolvedPermissions = Record<string, boolean>;

export type CachedAuthSnapshot = {
  user: CurrentUser;
  resolvedPermissions: CachedResolvedPermissions;
  cachedAt: string;
};

// Alignée sur la durée de vie du cookie de session (lib/session.ts) — inutile
// de garder un cache plus longtemps que la session elle-même n'est valide.
const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function readAuthCache(userId: string): Promise<CachedAuthSnapshot | null> {
  const filePath = cacheFilePath(userId);
  if (!filePath) return null;
  try {
    const raw = await readFile(filePath, "utf8");
    const snapshot = JSON.parse(raw) as CachedAuthSnapshot;
    const age = Date.now() - new Date(snapshot.cachedAt).getTime();
    if (Number.isNaN(age) || age > MAX_CACHE_AGE_MS) return null;
    return snapshot;
  } catch {
    return null;
  }
}

async function writeSnapshot(userId: string, snapshot: CachedAuthSnapshot): Promise<void> {
  const filePath = cacheFilePath(userId);
  if (!filePath) return;
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(snapshot), "utf8");
  } catch {
    // Best-effort : un échec d'écriture du cache ne doit jamais faire
    // échouer la connexion elle-même.
  }
}

/**
 * Remplace l'utilisateur en cache (appelé à chaque résolution réussie de
 * session), en conservant les permissions déjà mémorisées lors de
 * vérifications précédentes. Le statut d'abonnement n'a pas besoin d'être mis
 * en cache séparément : isSubscriptionBlocked() (lib/subscription.ts) échoue
 * déjà "ouvert" (non bloqué) quand Supabase est injoignable.
 */
export async function writeAuthCache(userId: string, data: { user: CurrentUser }): Promise<void> {
  if (!isDesktopBuild()) return;
  const existing = await readAuthCache(userId);
  await writeSnapshot(userId, {
    user: data.user,
    resolvedPermissions: existing?.resolvedPermissions ?? {},
    cachedAt: new Date().toISOString(),
  });
}

/**
 * Mémorise le résultat d'une vérification de permission réussie, pour
 * pouvoir la retrouver hors-ligne. Ne remplace que cette entrée — le reste du
 * cache (utilisateur, abonnement, autres permissions déjà connues) est
 * préservé.
 */
export async function rememberPermission(
  userId: string,
  permission: string,
  allowed: boolean
): Promise<void> {
  if (!isDesktopBuild()) return;
  const existing = await readAuthCache(userId);
  if (!existing) return; // pas de session utilisateur en cache : rien à enrichir
  existing.resolvedPermissions[permission] = allowed;
  existing.cachedAt = new Date().toISOString();
  await writeSnapshot(userId, existing);
}

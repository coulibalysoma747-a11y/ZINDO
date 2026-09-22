import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { supabase } from "@/lib/supabase";
import { isDesktopBuild, isNetworkError } from "@/lib/offline/auth-cache";

export { isDesktopBuild } from "@/lib/offline/auth-cache";

/**
 * Cache hors-ligne pour le contenu initial des pages serveur (Server
 * Components) du cœur du commerce — un besoin distinct du cache
 * d'authentification (lib/offline/auth-cache.ts) et de l'IndexedDB navigateur
 * (lib/offline/db.ts) : ce code tourne dans le process Node embarqué par
 * Electron, qui n'a pas accès à IndexedDB (propre au navigateur), et le
 * contenu diffère par page/module plutôt que par utilisateur.
 *
 * Contrairement aux helpers comme getCurrentLocation()/getBusinessSettings(),
 * qui avalent silencieusement une erreur réseau Supabase et renvoient une
 * valeur par défaut trompeuse (ex. "aucune boutique configurée" au lieu de
 * "hors ligne"), isSupabaseReachable() distingue explicitement les deux avant
 * d'appeler ces helpers, pour ne jamais confondre une vraie absence de
 * configuration avec une simple coupure réseau.
 */

let lastReachable: { at: number; value: boolean } | null = null;
const REACHABILITY_CACHE_MS = 5000; // évite une requête de sonde à chaque helper appelé dans la même page

export async function isSupabaseReachable(): Promise<boolean> {
  if (lastReachable && Date.now() - lastReachable.at < REACHABILITY_CACHE_MS) return lastReachable.value;
  const { error } = await supabase.from("businesses").select("id").limit(1);
  const reachable = !error || !isNetworkError(error);
  lastReachable = { at: Date.now(), value: reachable };
  return reachable;
}

function cacheFilePath(key: string): string | null {
  const dir = process.env.ZINDO_LOCAL_CACHE_DIR;
  if (!dir) return null;
  const safeKey = key.replace(/[^a-zA-Z0-9:_-]/g, "_");
  return path.join(dir, "page-cache", `${safeKey}.json`);
}

export async function readPageCache<T>(key: string): Promise<T | null> {
  const filePath = cacheFilePath(key);
  if (!filePath) return null;
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writePageCache<T>(key: string, data: T): Promise<void> {
  if (!isDesktopBuild()) return;
  const filePath = cacheFilePath(key);
  if (!filePath) return;
  try {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(data), "utf8");
  } catch {
    // Best-effort : un échec d'écriture du cache ne doit jamais faire échouer le rendu de la page.
  }
}

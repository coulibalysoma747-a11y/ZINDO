import "server-only";

/**
 * Petite mémoire à durée limitée, partagée par les requêtes d'une même instance
 * serveur. Pour des données publiques communes à tous les visiteurs (boutiques du
 * Marché, mises en avant, flag global…), qui peuvent avoir quelques secondes de
 * retard : évite de relire la base à chaque page. Une promesse en cours est
 * partagée, et un échec n'est jamais gardé.
 */
const store = new Map<string, { expires: number; value: Promise<unknown> }>();

export function memo<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as Promise<T>;
  const value = load().catch((error) => {
    store.delete(key);
    throw error;
  });
  store.set(key, { expires: now + ttlMs, value });
  return value;
}

/** Oublie une entrée (ex. après une modification faite par le vendeur ou l'admin). */
export function forget(prefix: string) {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}

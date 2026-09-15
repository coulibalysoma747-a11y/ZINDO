import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PosProduct } from "@/components/products/ProductGrid";
import type { CreateSaleInput } from "@/lib/actions/sales";

/**
 * Cache hors-ligne de l'écran de caisse (IndexedDB, navigateur uniquement).
 * Portée volontairement limitée : permet de continuer à encaisser si la
 * connexion tombe PENDANT que la page Vente est déjà ouverte (le cas réel le
 * plus courant avec une connexion intermittente), pas de démarrer l'appli à
 * froid sans jamais avoir été en ligne — ça demanderait de mettre en cache
 * la page elle-même via le service worker, hors périmètre ici.
 */

export type CachedCustomer = { id: string; name: string; phone: string | null };
export type CachedPaymentMethod = { method: CreateSaleInput["paymentMethod"]; label: string };

export type CachedBusinessInfo = {
  businessName: string;
  businessActivity: string | null;
  businessPhone: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  logoUrl: string | null;
  locationName: string;
  locationAddress: string | null;
  currency: string;
  footerMessage: string | null;
};

export type PendingSale = {
  clientRef: string;
  createdAt: string;
  input: CreateSaleInput;
  cashierName: string;
  customerName: string | null;
  syncStatus: "pending" | "error";
  syncError?: string;
};

interface ZindoOfflineDB extends DBSchema {
  products: { key: string; value: PosProduct };
  customers: { key: string; value: CachedCustomer };
  meta: { key: string; value: unknown };
  pendingSales: { key: string; value: PendingSale };
}

const DB_NAME = "zindo-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ZindoOfflineDB>> | null = null;

function getDB() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB indisponible dans cet environnement"));
  }
  if (!dbPromise) {
    dbPromise = openDB<ZindoOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("products")) db.createObjectStore("products", { keyPath: "id" });
        if (!db.objectStoreNames.contains("customers")) db.createObjectStore("customers", { keyPath: "id" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
        if (!db.objectStoreNames.contains("pendingSales")) db.createObjectStore("pendingSales", { keyPath: "clientRef" });
      },
    });
  }
  return dbPromise;
}

const META_KEY_BUSINESS = "businessInfo";
const META_KEY_LOCATION = "locationId";
const META_KEY_PAYMENT_METHODS = "paymentMethods";

/** Rafraîchit le cache local (produits, clients, infos du commerce) — à appeler à chaque chargement réussi en ligne. */
export async function cacheOfflineSnapshot(params: {
  locationId: string;
  products: PosProduct[];
  customers: CachedCustomer[];
  businessInfo: CachedBusinessInfo;
  paymentMethods: CachedPaymentMethod[];
}) {
  const db = await getDB();
  const tx = db.transaction(["products", "customers", "meta"], "readwrite");
  await tx.objectStore("products").clear();
  await tx.objectStore("customers").clear();
  await Promise.all([
    ...params.products.map((p) => tx.objectStore("products").put(p)),
    ...params.customers.map((c) => tx.objectStore("customers").put(c)),
    tx.objectStore("meta").put(params.businessInfo, META_KEY_BUSINESS),
    tx.objectStore("meta").put(params.locationId, META_KEY_LOCATION),
    tx.objectStore("meta").put(params.paymentMethods, META_KEY_PAYMENT_METHODS),
  ]);
  await tx.done;
}

export async function getCachedSnapshot(locationId: string): Promise<{
  products: PosProduct[];
  customers: CachedCustomer[];
  businessInfo: CachedBusinessInfo | null;
  paymentMethods: CachedPaymentMethod[];
} | null> {
  try {
    const db = await getDB();
    const cachedLocationId = await db.get("meta", META_KEY_LOCATION);
    if (cachedLocationId !== locationId) return null; // cache d'une autre boutique — pas fiable ici
    const [products, customers, businessInfo, paymentMethods] = await Promise.all([
      db.getAll("products"),
      db.getAll("customers"),
      db.get("meta", META_KEY_BUSINESS) as Promise<CachedBusinessInfo | undefined>,
      db.get("meta", META_KEY_PAYMENT_METHODS) as Promise<CachedPaymentMethod[] | undefined>,
    ]);
    return { products, customers, businessInfo: businessInfo ?? null, paymentMethods: paymentMethods ?? [] };
  } catch {
    return null;
  }
}

/** Décrémente le stock mis en cache après une vente hors ligne, pour ne pas survendre localement avant la synchro. */
export async function decrementCachedStock(items: { productId: string; quantity: number }[]) {
  try {
    const db = await getDB();
    const tx = db.transaction("products", "readwrite");
    for (const item of items) {
      const product = await tx.store.get(item.productId);
      if (product) await tx.store.put({ ...product, quantity: Math.max(0, product.quantity - item.quantity) });
    }
    await tx.done;
  } catch {
    // Cache local best-effort — une écriture ratée ici ne doit pas bloquer la vente elle-même.
  }
}

export async function queueOfflineSale(sale: Omit<PendingSale, "syncStatus" | "syncError">) {
  const db = await getDB();
  await db.put("pendingSales", { ...sale, syncStatus: "pending" });
}

export async function getPendingSales(): Promise<PendingSale[]> {
  try {
    const db = await getDB();
    const all = await db.getAll("pendingSales");
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function markPendingSaleError(clientRef: string, error: string) {
  const db = await getDB();
  const existing = await db.get("pendingSales", clientRef);
  if (existing) await db.put("pendingSales", { ...existing, syncStatus: "error", syncError: error });
}

export async function removePendingSale(clientRef: string) {
  const db = await getDB();
  await db.delete("pendingSales", clientRef);
}

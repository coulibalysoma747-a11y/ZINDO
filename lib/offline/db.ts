import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction, type StoreNames } from "idb";
import type { PosProduct } from "@/components/products/ProductGrid";
import type { CreateSaleInput } from "@/lib/actions/sales";

/**
 * Cache hors-ligne du cœur du commerce (IndexedDB, navigateur uniquement —
 * fonctionne aussi bien dans le navigateur Electron de l'application Windows
 * que dans un onglet web classique).
 *
 * `pendingWrites` est un moteur générique de file d'attente : chaque écriture
 * effectuée hors ligne (vente, mouvement de stock, nouveau client...) y est
 * posée avec une clé d'idempotence (`clientRef`) et un `kind` qui indique
 * quelle action serveur la rejouera à la reconnexion (voir
 * lib/offline/actions-registry.ts et lib/offline/sync.ts). `idResolution`
 * retrouve l'id serveur réel d'une entité créée hors ligne (ex. un client) à
 * partir de son id temporaire local, pour les écritures qui en dépendent
 * (ex. une vente à crédit pour ce client, mise en file juste après).
 */

export type CachedCustomer = { id: string; name: string; phone: string | null };
export type CachedSupplier = { id: string; name: string; company: string | null; phone: string | null };
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
  /** Préfixe des liens de vérification (voir lib/verification.ts::getVerificationBaseUrl) — absent d'un ancien cache. */
  verificationBaseUrl?: string;
  qrCodeSize?: number;
  /** Flag « mention_zindo_ticket » (lib/zindo-mention.ts) — absent d'un ancien cache. */
  zindoMention?: boolean;
};

export type PendingWriteKind =
  | "sale"
  | "stockMovement"
  | "customer"
  | "supplier"
  | "purchase"
  | "inventory"
  | "product";

export type PendingWriteStatus = "pending" | "blocked" | "error";

export type PendingWrite<TInput = unknown> = {
  clientRef: string;
  kind: PendingWriteKind;
  createdAt: string;
  input: TInput;
  /** Résumé lisible pour l'UI "en attente de synchronisation" (ex. nom du client, numéro de vente local). */
  label: string;
  /** Métadonnées propres au kind, non nécessaires au rejeu serveur (ex. cashierName/customerName pour une vente). */
  meta?: Record<string, unknown>;
  /** Champs de `input` référençant un id local (ex. { field: "customerId", localId: "local:..." }) non encore résolu. */
  localRefs?: { field: string; localId: string }[];
  syncStatus: PendingWriteStatus;
  syncError?: string;
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
  suppliers: { key: string; value: CachedSupplier };
  meta: { key: string; value: unknown };
  pendingWrites: {
    key: string;
    value: PendingWrite;
    indexes: { kind: PendingWriteKind };
  };
  idResolution: { key: string; value: { localId: string; serverId: string } };
}

const DB_NAME = "zindo-offline";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<ZindoOfflineDB>> | null = null;

type UpgradeTx = IDBPTransaction<ZindoOfflineDB, StoreNames<ZindoOfflineDB>[], "versionchange">;

async function migratePendingSalesToPendingWrites(tx: UpgradeTx) {
  // v1 stockait les ventes en attente dans son propre store "pendingSales" —
  // on les reprend telles quelles dans le nouveau store générique pour ne
  // rien perdre d'une file d'attente déjà en cours chez un commerçant.
  const oldStoreName = "pendingSales" as unknown as "pendingWrites";
  if (!tx.objectStoreNames.contains(oldStoreName)) return;
  const oldStore = tx.objectStore(oldStoreName);
  const oldSales = (await oldStore.getAll()) as unknown as PendingSale[];
  const newStore = tx.objectStore("pendingWrites");
  for (const sale of oldSales) {
    await newStore.put({
      clientRef: sale.clientRef,
      kind: "sale",
      createdAt: sale.createdAt,
      input: sale.input,
      label: sale.customerName ?? sale.cashierName,
      meta: { cashierName: sale.cashierName, customerName: sale.customerName },
      syncStatus: sale.syncStatus,
      syncError: sale.syncError,
    });
  }
  tx.db.deleteObjectStore(oldStoreName);
}

function getDB() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB indisponible dans cet environnement"));
  }
  if (!dbPromise) {
    dbPromise = openDB<ZindoOfflineDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains("products")) db.createObjectStore("products", { keyPath: "id" });
        if (!db.objectStoreNames.contains("customers")) db.createObjectStore("customers", { keyPath: "id" });
        if (!db.objectStoreNames.contains("suppliers")) db.createObjectStore("suppliers", { keyPath: "id" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
        if (!db.objectStoreNames.contains("idResolution")) db.createObjectStore("idResolution", { keyPath: "localId" });
        if (!db.objectStoreNames.contains("pendingWrites")) {
          const store = db.createObjectStore("pendingWrites", { keyPath: "clientRef" });
          store.createIndex("kind", "kind");
        }
        if (oldVersion < 2) await migratePendingSalesToPendingWrites(tx);
      },
    });
  }
  return dbPromise;
}

const META_KEY_BUSINESS = "businessInfo";
const META_KEY_LOCATION = "locationId";
const META_KEY_PAYMENT_METHODS = "paymentMethods";

/** Rafraîchit le cache local (produits, clients, fournisseurs, infos du commerce) — à appeler à chaque chargement réussi en ligne. */
export async function cacheOfflineSnapshot(params: {
  locationId: string;
  products: PosProduct[];
  customers: CachedCustomer[];
  suppliers?: CachedSupplier[];
  businessInfo: CachedBusinessInfo;
  paymentMethods: CachedPaymentMethod[];
}) {
  const db = await getDB();
  const tx = db.transaction(["products", "customers", "suppliers", "meta"], "readwrite");
  await tx.objectStore("products").clear();
  await tx.objectStore("customers").clear();
  const writes = [
    ...params.products.map((p) => tx.objectStore("products").put(p)),
    ...params.customers.map((c) => tx.objectStore("customers").put(c)),
    tx.objectStore("meta").put(params.businessInfo, META_KEY_BUSINESS),
    tx.objectStore("meta").put(params.locationId, META_KEY_LOCATION),
    tx.objectStore("meta").put(params.paymentMethods, META_KEY_PAYMENT_METHODS),
  ];
  if (params.suppliers) {
    await tx.objectStore("suppliers").clear();
    writes.push(...params.suppliers.map((s) => tx.objectStore("suppliers").put(s)));
  }
  await Promise.all(writes);
  await tx.done;
}

export async function getCachedSnapshot(locationId: string): Promise<{
  products: PosProduct[];
  customers: CachedCustomer[];
  suppliers: CachedSupplier[];
  businessInfo: CachedBusinessInfo | null;
  paymentMethods: CachedPaymentMethod[];
} | null> {
  try {
    const db = await getDB();
    const cachedLocationId = await db.get("meta", META_KEY_LOCATION);
    if (cachedLocationId !== locationId) return null; // cache d'une autre boutique — pas fiable ici
    const [products, customers, suppliers, businessInfo, paymentMethods] = await Promise.all([
      db.getAll("products"),
      db.getAll("customers"),
      db.getAll("suppliers"),
      db.get("meta", META_KEY_BUSINESS) as Promise<CachedBusinessInfo | undefined>,
      db.get("meta", META_KEY_PAYMENT_METHODS) as Promise<CachedPaymentMethod[] | undefined>,
    ]);
    return { products, customers, suppliers, businessInfo: businessInfo ?? null, paymentMethods: paymentMethods ?? [] };
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

// --- Moteur générique de file d'attente -------------------------------------

export async function queueOfflineWrite(write: Omit<PendingWrite, "syncStatus" | "syncError">) {
  const db = await getDB();
  await db.put("pendingWrites", { ...write, syncStatus: write.localRefs?.length ? "blocked" : "pending" });
}

export async function getPendingWrites(): Promise<PendingWrite[]> {
  try {
    const db = await getDB();
    const all = await db.getAll("pendingWrites");
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function markPendingWriteError(clientRef: string, error: string) {
  const db = await getDB();
  const existing = await db.get("pendingWrites", clientRef);
  if (existing) await db.put("pendingWrites", { ...existing, syncStatus: "error", syncError: error });
}

export async function markPendingWriteBlocked(clientRef: string) {
  const db = await getDB();
  const existing = await db.get("pendingWrites", clientRef);
  if (existing) await db.put("pendingWrites", { ...existing, syncStatus: "blocked", syncError: undefined });
}

export async function removePendingWrite(clientRef: string) {
  const db = await getDB();
  await db.delete("pendingWrites", clientRef);
}

export async function resolveLocalId(localId: string, serverId: string) {
  const db = await getDB();
  await db.put("idResolution", { localId, serverId });
}

export async function getResolvedId(localId: string): Promise<string | null> {
  const db = await getDB();
  const entry = await db.get("idResolution", localId);
  return entry?.serverId ?? null;
}

// --- Wrappers ventes (compatibilité — voir app/(app)/ventes/POS.tsx) --------

export async function queueOfflineSale(sale: Omit<PendingSale, "syncStatus" | "syncError">) {
  await queueOfflineWrite({
    clientRef: sale.clientRef,
    kind: "sale",
    createdAt: sale.createdAt,
    input: sale.input,
    label: sale.customerName ?? sale.cashierName,
    meta: { cashierName: sale.cashierName, customerName: sale.customerName },
  });
}

function toPendingSale(write: PendingWrite): PendingSale {
  const meta = (write.meta ?? {}) as { cashierName?: string; customerName?: string | null };
  return {
    clientRef: write.clientRef,
    createdAt: write.createdAt,
    input: write.input as CreateSaleInput,
    cashierName: meta.cashierName ?? "",
    customerName: meta.customerName ?? null,
    syncStatus: write.syncStatus === "error" ? "error" : "pending",
    syncError: write.syncError,
  };
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const writes = await getPendingWrites();
  return writes.filter((w) => w.kind === "sale").map(toPendingSale);
}

export async function markPendingSaleError(clientRef: string, error: string) {
  await markPendingWriteError(clientRef, error);
}

export async function removePendingSale(clientRef: string) {
  await removePendingWrite(clientRef);
}

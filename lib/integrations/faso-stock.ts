import "server-only";

// Client pour l'API FasoStock (https://www.fasostock.com/api/v1), vérifiée
// directement contre le compte réel de l'utilisateur (clé "ZINDO" créée dans
// FasoStock → Paramètres → Intégrations API). API en LECTURE SEULE : elle ne
// permet ni de modifier ni de créer quoi que ce soit chez FasoStock, et
// n'expose jamais le prix d'achat ni les marges — la synchronisation ne peut
// donc se faire que dans un sens, FasoStock → ZINDO.
const FASO_STOCK_BASE_URL = "https://www.fasostock.com/api/v1";

export type FasoStockStore = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  is_primary?: boolean;
};

export type FasoStockProduct = {
  id: string;
  sku: string | null;
  name: string;
  unit: string | null;
  brand: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  barcode: string | null;
  description: string | null;
  sale_price: number;
  price: number;
  promotion: { discount_percent: number; price: number } | null;
  stock: number;
  in_stock: boolean;
  images: string[];
  packagings: Array<{ id: string; label: string; barcode: string | null; quantity: number; price: number; unit_price: number }>;
  updated_at: string;
};

export type FasoStockProductsPage = {
  company: { id: string; name: string };
  store: { id: string; code: string; name: string; address: string | null };
  currency: string;
  total: number;
  count: number;
  limit: number;
  offset: number;
  has_more: boolean;
  next_offset: number | null;
  products: FasoStockProduct[];
};

export class FasoStockError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "FasoStockError";
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  401: "Clé API FasoStock absente ou révoquée.",
  403: "Cette boutique n'est pas autorisée pour cette clé FasoStock.",
  404: "Boutique FasoStock introuvable.",
  429: "Trop de requêtes envoyées à FasoStock — réessayez dans un instant.",
  503: "Le service FasoStock est momentanément indisponible.",
};

async function fasoStockFetch<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${FASO_STOCK_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!res.ok) {
    let body: { error?: string; code?: string; message?: string } | null = null;
    try {
      body = await res.json();
    } catch {
      // réponse d'erreur sans corps JSON exploitable
    }
    const message = body?.message ?? body?.error ?? STATUS_MESSAGES[res.status] ?? `Erreur FasoStock (${res.status})`;
    throw new FasoStockError(res.status, message, body?.code);
  }
  return (await res.json()) as T;
}

export async function listFasoStockStores(apiKey: string): Promise<FasoStockStore[]> {
  const data = await fasoStockFetch<{ stores: FasoStockStore[] }>(apiKey, "/stores");
  return data.stores;
}

const PAGE_SIZE = 500;

export async function listFasoStockProducts(
  apiKey: string,
  storeId: string,
  offset: number
): Promise<FasoStockProductsPage> {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  return fasoStockFetch<FasoStockProductsPage>(apiKey, `/stores/${storeId}/products?${params.toString()}`);
}

/** Récupère la totalité des produits d'une boutique FasoStock, page par page. */
export async function fetchAllFasoStockProducts(apiKey: string, storeId: string): Promise<FasoStockProduct[]> {
  const all: FasoStockProduct[] = [];
  let offset = 0;
  for (;;) {
    const page = await listFasoStockProducts(apiKey, storeId, offset);
    all.push(...page.products);
    if (!page.has_more || page.next_offset == null) break;
    offset = page.next_offset;
  }
  return all;
}

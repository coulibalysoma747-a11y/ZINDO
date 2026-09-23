import "server-only";
import { supabase } from "@/lib/supabase";
import { adjustStock } from "@/lib/stock";
import { generateProductReference } from "@/lib/reference";

/**
 * Synchronisation FasoStock ⇄ ZINDO par fichiers, pour un commerçant qui
 * utilise les deux logiciels en même temps sans clé API FasoStock.
 *
 * - Réception : l'export Excel « Stock » de FasoStock est comparé à celui de
 *   la réception précédente, et seules les différences sont appliquées au
 *   stock ZINDO — les ventes/entrées faites dans ZINDO entre-temps ne sont
 *   donc jamais écrasées (contrairement à l'import CSV, qui remplace).
 * - Envoi : ZINDO produit un CSV au format du modèle d'import FasoStock, dont
 *   la colonne stock_entrant porte ce qui a bougé dans ZINDO depuis le
 *   dernier envoi.
 *
 * FasoStock ne confirme rien : à la réception suivante, on déduit si le
 * dernier envoi y a bien été importé en regardant, pour les produits envoyés,
 * si leur quantité FasoStock a bougé exactement du montant envoyé (vote
 * majoritaire, séparément pour les montants positifs et négatifs — FasoStock
 * pourrait n'accepter que les entrées). Un envoi non pris en compte est
 * simplement remis dans le prochain envoi.
 *
 * L'état (dernières quantités vues de chaque côté) est un JSON par boutique
 * dans un bucket Storage privé, pour ne nécessiter aucune migration SQL.
 */

const STATE_BUCKET = "faso-stock-sync";
const PAGE_SIZE = 1000;
const INSERT_CHUNK = 500;
export const FASO_SYNC_NOTE = "Synchro FasoStock";

type CatalogSnapshot = {
  name: string;
  category: string;
  brand: string;
  unit: string;
  minStock: number;
  purchasePrice: number;
  salePrice: number;
};

type ItemState = {
  /** Quantité FasoStock lors de la dernière réception. */
  faso: number;
  /** Stock ZINDO juste après la dernière réception ou le dernier envoi. */
  zindo: number;
  /** Changements ZINDO pas encore envoyés à FasoStock. */
  pending: number;
  /** Envoyé à FasoStock depuis la dernière réception, pas encore confirmé. */
  sent: number;
  /** Dernières valeurs catalogue vues dans FasoStock (null : produit créé dans ZINDO). */
  catalog: CatalogSnapshot | null;
};

type SyncState = {
  version: 1;
  receivedAt: string | null;
  sentAt: string | null;
  items: Record<string, ItemState>; // clé : id produit ZINDO
};

type FasoRow = CatalogSnapshot & { line: number; sku: string; quantity: number };

export type FasoReceiveResult =
  | {
      success: true;
      firstTime: boolean;
      rows: number;
      productsCreated: number;
      catalogUpdated: number;
      stockChanged: number;
      lastSend: "aucun" | "confirme" | "non_pris_en_compte" | "partiel";
    }
  | { success: false; error: string; rowErrors?: string[] };

export type FasoSendResult =
  | { success: true; csv: string; rows: number }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Lecture de l'export FasoStock
// ---------------------------------------------------------------------------

const HEADER_ALIASES: Record<keyof Omit<FasoRow, "line">, string[]> = {
  name: ["produit", "nom"],
  sku: ["sku"],
  category: ["catégorie", "categorie"],
  brand: ["marque"],
  quantity: ["qté", "qte", "quantité", "quantite", "stock"],
  unit: ["unité", "unite"],
  minStock: ["seuil", "stock_min"],
  purchasePrice: ["achat", "prix_achat"],
  salePrice: ["vente", "prix_vente"],
};

export function parseFasoStockExport(sheet: string[][]): { rows: FasoRow[]; errors: string[] } {
  const headerIndex = sheet.findIndex((r) => {
    const cells = r.map((c) => c.trim().toLowerCase());
    return cells.includes("sku") && HEADER_ALIASES.quantity.some((a) => cells.includes(a));
  });
  if (headerIndex < 0) {
    return {
      rows: [],
      errors: ["Ce n'est pas un export « Stock » de FasoStock (colonnes SKU et Qté introuvables)"],
    };
  }
  const header = sheet[headerIndex].map((c) => c.trim().toLowerCase());
  const col = (key: keyof typeof HEADER_ALIASES) => header.findIndex((h) => HEADER_ALIASES[key].includes(h));
  const missing = (["name", "quantity", "salePrice"] as const).filter((k) => col(k) < 0);
  if (missing.length > 0) return { rows: [], errors: [`Colonnes manquantes : ${missing.join(", ")}`] };

  const rows: FasoRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  const cell = (r: string[], key: keyof typeof HEADER_ALIASES) => (col(key) >= 0 ? (r[col(key)] ?? "").trim() : "");
  const num = (s: string) => (s === "" ? 0 : Number(s.replace(",", ".")));

  for (let i = headerIndex + 1; i < sheet.length; i++) {
    const r = sheet[i];
    if (!r || r.every((c) => c.trim() === "")) continue;
    const line = i + 1;
    const name = cell(r, "name");
    if (!name) {
      errors.push(`Ligne ${line} : nom manquant`);
      continue;
    }
    const quantity = num(cell(r, "quantity"));
    const salePrice = num(cell(r, "salePrice"));
    const purchasePrice = num(cell(r, "purchasePrice"));
    const minStock = cell(r, "minStock") === "" ? 5 : num(cell(r, "minStock"));
    if (!Number.isInteger(quantity)) errors.push(`Ligne ${line} (${name}) : quantité invalide "${cell(r, "quantity")}"`);
    if (!Number.isFinite(salePrice) || salePrice < 0) errors.push(`Ligne ${line} (${name}) : prix de vente invalide`);
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) errors.push(`Ligne ${line} (${name}) : prix d'achat invalide`);
    if (!Number.isInteger(minStock) || minStock < 0) errors.push(`Ligne ${line} (${name}) : seuil invalide`);
    const sku = cell(r, "sku");
    const key = (sku || `nom:${name}`).toLowerCase();
    if (seen.has(key)) errors.push(`Ligne ${line} : « ${sku || name} » apparaît deux fois`);
    seen.add(key);
    rows.push({
      line,
      sku,
      name,
      quantity,
      category: cell(r, "category"),
      brand: cell(r, "brand"),
      unit: cell(r, "unit") || "pce",
      minStock,
      purchasePrice,
      salePrice,
    });
  }
  return { rows, errors };
}

// ---------------------------------------------------------------------------
// Réception : FasoStock → ZINDO
// ---------------------------------------------------------------------------

export async function receiveFasoStockExport(params: {
  businessId: string;
  userId: string;
  locationId: string;
  rows: FasoRow[];
}): Promise<FasoReceiveResult> {
  const { businessId, userId, locationId, rows } = params;
  const state = (await loadState(businessId, locationId)) ?? emptyState();
  const firstTime = state.receivedAt === null;

  const products = await loadProducts(businessId);
  const byReference = new Map(products.map((p) => [p.reference.toLowerCase(), p]));
  const byName = new Map(products.map((p) => [p.name.toLowerCase(), p]));
  const stocks = await loadStocks(locationId);
  const categoryIds = await ensureCategories(businessId, rows.map((r) => r.category));
  await ensureBrands(businessId, rows.map((r) => r.brand));

  // Le dernier envoi a-t-il été importé dans FasoStock ? (voir en-tête)
  const votes = { pos: { yes: 0, no: 0 }, neg: { yes: 0, no: 0 } };
  const productFor = (row: FasoRow) =>
    row.sku ? byReference.get(row.sku.toLowerCase()) : byName.get(row.name.toLowerCase());
  for (const row of rows) {
    const product = productFor(row);
    const item = product ? state.items[product.id] : undefined;
    if (!item || item.sent === 0) continue;
    const bucket = item.sent > 0 ? votes.pos : votes.neg;
    const observed = row.quantity - item.faso;
    if (observed === item.sent) bucket.yes++;
    else if (observed === 0) bucket.no++;
  }
  const appliedPos = votes.pos.yes >= votes.pos.no;
  const appliedNeg = votes.neg.yes >= votes.neg.no;
  const hadSend = votes.pos.yes + votes.pos.no + votes.neg.yes + votes.neg.no > 0;

  let productsCreated = 0;
  let catalogUpdated = 0;
  let stockChanged = 0;
  const movements: Record<string, unknown>[] = [];

  for (const row of rows) {
    const snapshot: CatalogSnapshot = {
      name: row.name,
      category: row.category,
      brand: row.brand,
      unit: row.unit,
      minStock: row.minStock,
      purchasePrice: row.purchasePrice,
      salePrice: row.salePrice,
    };
    const catalogFields = (fields: Partial<CatalogSnapshot>) => {
      const out: Record<string, unknown> = {};
      if (fields.name !== undefined) out.name = fields.name;
      if (fields.category !== undefined) out.category_id = categoryIds.get(fields.category.toLowerCase()) ?? null;
      if (fields.brand !== undefined) out.brand = fields.brand || null;
      if (fields.unit !== undefined) out.unit = fields.unit;
      if (fields.minStock !== undefined) out.min_stock = fields.minStock;
      if (fields.purchasePrice !== undefined) out.purchase_price = fields.purchasePrice;
      if (fields.salePrice !== undefined) out.sale_price = fields.salePrice;
      return out;
    };

    let product = productFor(row);
    if (!product) {
      const reference = row.sku || (await generateProductReference(businessId));
      const { data, error } = await supabase
        .from("products")
        .insert({ business_id: businessId, reference, active: true, ...catalogFields(snapshot) })
        .select("id, reference, name")
        .single();
      if (error || !data) {
        console.error(`[receiveFasoStockExport] Création impossible ligne ${row.line} :`, error?.message);
        continue;
      }
      product = { id: data.id as string, reference: data.reference as string, name: data.name as string };
      productsCreated++;
    } else {
      // Seuls les champs modifiés dans FasoStock depuis la dernière réception
      // sont repris — une modification faite dans ZINDO n'est pas écrasée.
      const previous = state.items[product.id]?.catalog;
      const changed: Partial<CatalogSnapshot> = previous
        ? Object.fromEntries(
            (Object.keys(snapshot) as (keyof CatalogSnapshot)[])
              .filter((k) => snapshot[k] !== previous[k])
              .map((k) => [k, snapshot[k]])
          )
        : snapshot;
      if (Object.keys(changed).length > 0) {
        const { error } = await supabase.from("products").update(catalogFields(changed)).eq("id", product.id);
        if (error) console.error(`[receiveFasoStockExport] Mise à jour ligne ${row.line} :`, error.message);
        else catalogUpdated++;
      }
    }

    const current = stocks.get(product.id) ?? 0;
    const item = state.items[product.id];
    let delta: number;
    let pending = 0;
    if (!item) {
      // Première fois : FasoStock fait foi.
      delta = row.quantity - current;
    } else {
      const applied = item.sent > 0 ? appliedPos : item.sent < 0 ? appliedNeg : true;
      delta = row.quantity - (item.faso + (applied ? item.sent : 0));
      pending = item.pending + (current - item.zindo) + (applied ? 0 : item.sent);
    }

    let newStock = current;
    if (delta !== 0) {
      const result = await adjustStock({ productId: product.id, locationId, delta });
      newStock = result.newStock;
      movements.push({
        business_id: businessId,
        location_id: locationId,
        product_id: product.id,
        direction: delta > 0 ? "IN" : "OUT",
        reason: "CORRECTION",
        quantity: Math.abs(delta),
        old_stock: result.oldStock,
        new_stock: result.newStock,
        note: FASO_SYNC_NOTE,
        user_id: userId,
      });
      stockChanged++;
    }
    state.items[product.id] = { faso: row.quantity, zindo: newStock, pending, sent: 0, catalog: snapshot };
  }

  for (let i = 0; i < movements.length; i += INSERT_CHUNK) {
    const { error } = await supabase.from("stock_movements").insert(movements.slice(i, i + INSERT_CHUNK));
    if (error) console.error("[receiveFasoStockExport] Mouvements :", error.message);
  }

  state.receivedAt = new Date().toISOString();
  await saveState(businessId, locationId, state);

  const lastSend = !hadSend
    ? "aucun"
    : appliedPos && appliedNeg
      ? "confirme"
      : !appliedPos && !appliedNeg
        ? "non_pris_en_compte"
        : "partiel";
  return { success: true, firstTime, rows: rows.length, productsCreated, catalogUpdated, stockChanged, lastSend };
}

// ---------------------------------------------------------------------------
// Envoi : ZINDO → FasoStock
// ---------------------------------------------------------------------------

const FASO_IMPORT_HEADER = [
  "nom",
  "sku",
  "code_barres",
  "unite",
  "prix_achat",
  "prix_vente",
  "stock_min",
  "description",
  "actif",
  "categorie",
  "marque",
  "stock_entrant",
];

export async function buildFasoStockImportFile(params: {
  businessId: string;
  locationId: string;
}): Promise<FasoSendResult> {
  const { businessId, locationId } = params;
  const state = await loadState(businessId, locationId);
  if (!state?.receivedAt) {
    return { success: false, error: "Recevez d'abord un export FasoStock (étape 1) avant d'envoyer." };
  }

  const products = await loadProducts(businessId, true);
  const stocks = await loadStocks(locationId);
  const lines = [FASO_IMPORT_HEADER.join(",")];

  for (const p of products) {
    const current = stocks.get(p.id) ?? 0;
    const item = state.items[p.id];
    let toSend: number;
    if (item) {
      toSend = item.pending + (current - item.zindo);
      if (toSend === 0) continue;
      item.sent += toSend;
      item.pending = 0;
      item.zindo = current;
    } else {
      // Produit créé dans ZINDO, inconnu de FasoStock : on l'y crée avec son stock.
      if (!p.active) continue;
      toSend = current;
      state.items[p.id] = { faso: 0, zindo: current, pending: 0, sent: current, catalog: null };
    }
    lines.push(
      [
        p.name,
        p.reference,
        p.barcode ?? "",
        p.unit ?? "",
        p.purchasePrice ?? 0,
        p.salePrice ?? 0,
        p.minStock ?? 0,
        "",
        p.active ? 1 : 0,
        p.categoryName ?? "",
        p.brand ?? "",
        toSend,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  if (lines.length === 1) return { success: false, error: "Rien à envoyer : aucun changement dans ZINDO depuis le dernier envoi." };

  state.sentAt = new Date().toISOString();
  await saveState(businessId, locationId, state);
  return { success: true, csv: "﻿" + lines.join("\r\n") + "\r\n", rows: lines.length - 1 };
}

export async function getFasoSyncStatus(businessId: string, locationId: string) {
  const state = await loadState(businessId, locationId);
  return { receivedAt: state?.receivedAt ?? null, sentAt: state?.sentAt ?? null };
}

// ---------------------------------------------------------------------------
// Accès aux données
// ---------------------------------------------------------------------------

type ProductRow = {
  id: string;
  reference: string;
  name: string;
  barcode?: string | null;
  unit?: string | null;
  purchasePrice?: number | null;
  salePrice?: number | null;
  minStock?: number | null;
  active?: boolean;
  brand?: string | null;
  categoryName?: string | null;
};

async function loadProducts(businessId: string, withDetails = false): Promise<ProductRow[]> {
  const columns = withDetails
    ? "id, reference, name, barcode, unit, purchasePrice:purchase_price, salePrice:sale_price, minStock:min_stock, active, brand, category:categories(name)"
    : "id, reference, name";
  const all: ProductRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("products")
      .select(columns)
      .eq("business_id", businessId)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Lecture des produits impossible : ${error.message}`);
    for (const raw of (data ?? []) as unknown as (ProductRow & { category?: { name: string } | null })[]) {
      all.push({ ...raw, categoryName: raw.category?.name ?? null });
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return all;
}

async function loadStocks(locationId: string): Promise<Map<string, number>> {
  const stocks = new Map<string, number>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("product_stocks")
      .select("product_id, quantity")
      .eq("location_id", locationId)
      .order("product_id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Lecture du stock impossible : ${error.message}`);
    for (const s of data ?? []) stocks.set(s.product_id as string, s.quantity as number);
    if (!data || data.length < PAGE_SIZE) break;
  }
  return stocks;
}

async function ensureCategories(businessId: string, names: string[]) {
  const wanted = [...new Set(names.filter(Boolean))];
  const ids = new Map<string, string>();
  if (wanted.length === 0) return ids;
  const { data: existing } = await supabase.from("categories").select("id, name").eq("business_id", businessId);
  for (const c of existing ?? []) ids.set((c.name as string).toLowerCase(), c.id as string);
  const missing = [...new Map(wanted.filter((n) => !ids.has(n.toLowerCase())).map((n) => [n.toLowerCase(), n])).values()];
  if (missing.length > 0) {
    const { data: created } = await supabase
      .from("categories")
      .insert(missing.map((name) => ({ business_id: businessId, name })))
      .select("id, name");
    for (const c of created ?? []) ids.set((c.name as string).toLowerCase(), c.id as string);
  }
  return ids;
}

async function ensureBrands(businessId: string, names: string[]) {
  const wanted = [...new Set(names.filter(Boolean))];
  if (wanted.length === 0) return;
  const { data: existing } = await supabase.from("brands").select("name").eq("business_id", businessId);
  const known = new Set((existing ?? []).map((b) => (b.name as string).toLowerCase()));
  const missing = [...new Map(wanted.filter((n) => !known.has(n.toLowerCase())).map((n) => [n.toLowerCase(), n])).values()];
  if (missing.length > 0) await supabase.from("brands").insert(missing.map((name) => ({ business_id: businessId, name })));
}

function emptyState(): SyncState {
  return { version: 1, receivedAt: null, sentAt: null, items: {} };
}

function statePath(businessId: string, locationId: string) {
  return `${businessId}/${locationId}.json`;
}

async function loadState(businessId: string, locationId: string): Promise<SyncState | null> {
  const { data, error } = await supabase.storage.from(STATE_BUCKET).download(statePath(businessId, locationId));
  if (error) {
    // Seule l'absence d'état veut dire « jamais synchronisé » : toute autre
    // erreur ferait sinon repartir de zéro et écraser le stock ZINDO.
    const status = (error as { status?: number; statusCode?: string | number }).status;
    if (status === 400 || status === 404 || /not found/i.test(error.message)) return null;
    throw new Error(`Lecture de l'état de synchronisation impossible : ${error.message}`);
  }
  return JSON.parse(await data.text()) as SyncState;
}

async function saveState(businessId: string, locationId: string, state: SyncState) {
  const body = JSON.stringify(state);
  const upload = () =>
    supabase.storage
      .from(STATE_BUCKET)
      .upload(statePath(businessId, locationId), body, { upsert: true, contentType: "application/json" });
  let { error } = await upload();
  if (error && /bucket not found/i.test(error.message)) {
    // Bucket privé créé au premier usage (aucune migration à exécuter).
    await supabase.storage.createBucket(STATE_BUCKET, { public: false });
    ({ error } = await upload());
  }
  if (error) throw new Error(`Enregistrement de l'état de synchronisation impossible : ${error.message}`);
}

function csvCell(value: unknown) {
  const s = String(value ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

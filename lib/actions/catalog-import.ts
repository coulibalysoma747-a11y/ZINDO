"use server";

import { z } from "zod";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { getAnthropicClient, ASSISTANT_MODEL, isAssistantConfigured } from "@/lib/ai/client";
import { isFeatureEnabled, registerFeatureFlag } from "@/lib/feature-flags";
import { generateProductReference } from "@/lib/reference";
import { checkLimit } from "@/lib/subscription";
import { logAction } from "@/lib/audit";
import { saveProductPhotoFromBuffer } from "@/lib/photo-upload";

/**
 * Import de catalogue PDF (extraction par IA) : nouvelle fonctionnalité,
 * désactivée par défaut pour tous les commerçants tant qu'elle n'est pas
 * explicitement activée depuis /admin/fonctionnalites — voir la règle du
 * memory "Feature rollout rule".
 *
 * Un fichier "use server" ne peut exporter que des fonctions async (les
 * exports de constantes font échouer la compilation des Server Actions) —
 * cette clé reste donc privée au module plutôt qu'exportée.
 */
const CATALOG_IMPORT_FLAG = "import_catalogue_pdf";

export async function ensureCatalogImportFlagRegistered() {
  await registerFeatureFlag(
    CATALOG_IMPORT_FLAG,
    "Import de catalogue (PDF)",
    "Extraction automatique par IA d'une liste de produits (nom, prix, photos) depuis un catalogue PDF fournisseur."
  );
}

// Aligné sur next.config.ts (experimental.serverActions.bodySizeLimit) — lui
// même choisi en-dessous de la limite plateforme Vercel (~4,5 Mo).
const MAX_PDF_BYTES = 4 * 1024 * 1024;
const MAX_IMAGES = 20;
const MIN_IMAGE_BYTES = 3000; // filtre les puces/icônes décoratives du PDF

export type ExtractedProduct = {
  name: string;
  reference?: string;
  unit?: string;
  purchasePrice?: number;
  salePrice?: number;
  description?: string;
};
export type ExtractedImage = { index: number; dataUrl: string };

export type AnalyzeCatalogResult =
  | { success: true; products: ExtractedProduct[]; images: ExtractedImage[] }
  | { success: false; error: string };

const extractedProductSchema = z.object({
  name: z.string().min(1),
  reference: z.string().optional(),
  unit: z.string().optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
});
const catalogSchema = z.array(extractedProductSchema).max(200);

const EXTRACTION_PROMPT = `Tu analyses un catalogue produits (liste de prix fournisseur, catalogue PDF...) pour une application de gestion de stock au Burkina Faso (devise FCFA/XOF sauf indication contraire dans le document).

Extrait CHAQUE produit/article que tu identifies dans ce document (jusqu'à 200). Pour chacun, donne :
- name (obligatoire) : nom du produit
- reference (optionnel) : code/référence/SKU si présent dans le document
- unit (optionnel) : unité de vente si mentionnée (ex: "pièce", "carton", "kg") — sinon omets ce champ
- purchasePrice (optionnel, nombre) : prix d'achat/prix grossiste si distinct du prix de vente, sinon omets
- salePrice (optionnel, nombre) : prix de vente / prix affiché au client — c'est le prix principal du document
- description (optionnel) : détail court si présent (taille, couleur, modèle...)

Règles :
- Si un seul prix est affiché par produit (cas le plus courant), mets-le dans salePrice et omets purchasePrice.
- N'invente JAMAIS de prix ou de référence non présents dans le document.
- Ignore les en-têtes, pieds de page, conditions générales, sommaires, mentions légales.
- Si le document n'est pas un catalogue produits, renvoie un tableau vide.

Réponds UNIQUEMENT avec un tableau JSON valide (pas de texte avant/après, pas de balises markdown), au format :
[{"name": "...", "reference": "...", "unit": "...", "purchasePrice": 0, "salePrice": 0, "description": "..."}]`;

function extractJsonArray(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("Réponse IA sans tableau JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

/**
 * Recherche best-effort de JPEG bruts dans le PDF (marqueurs SOI/EOI) — la
 * plupart des générateurs de catalogue embarquent les photos en JPEG non
 * recompressé (filtre DCTDecode). Ne trouve donc rien pour un PDF dont les
 * images sont en PNG ou vectorielles ; c'est un choix assumé (simplicité et
 * fiabilité plutôt qu'un rendu de page complet côté serveur).
 */
function extractJpegImages(buffer: Buffer, maxImages: number): Buffer[] {
  const images: Buffer[] = [];
  const soiMarker = Buffer.from([0xff, 0xd8, 0xff]);
  const eoiMarker = Buffer.from([0xff, 0xd9]);
  let cursor = 0;
  while (images.length < maxImages) {
    const soi = buffer.indexOf(soiMarker, cursor);
    if (soi === -1) break;
    const eoi = buffer.indexOf(eoiMarker, soi + soiMarker.length);
    if (eoi === -1) break;
    const end = eoi + eoiMarker.length;
    const candidate = buffer.subarray(soi, end);
    if (candidate.length >= MIN_IMAGE_BYTES) images.push(Buffer.from(candidate));
    cursor = end;
  }
  return images;
}

export async function analyzeCatalogPdfAction(formData: FormData): Promise<AnalyzeCatalogResult> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  await ensureCatalogImportFlagRegistered();
  const enabled = await isFeatureEnabled(CATALOG_IMPORT_FLAG, user.businessId);
  if (!enabled) {
    return { success: false, error: "Cette fonctionnalité n'est pas encore activée pour votre compte." };
  }
  if (!isAssistantConfigured()) {
    return { success: false, error: "L'extraction par IA n'est pas configurée (clé ANTHROPIC_API_KEY manquante côté serveur)." };
  }

  const file = formData.get("pdf");
  if (!(file instanceof File) || file.size === 0) return { success: false, error: "Choisissez un fichier PDF" };
  if (file.type !== "application/pdf") return { success: false, error: "Le fichier doit être un PDF" };
  if (file.size > MAX_PDF_BYTES) {
    return {
      success: false,
      error: `Le fichier dépasse ${Math.floor(MAX_PDF_BYTES / (1024 * 1024))} Mo — réduisez-le (moins de pages, photos compressées) et réessayez.`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let products: ExtractedProduct[];
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: ASSISTANT_MODEL,
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") } },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : undefined;
    if (!text) throw new Error("Réponse IA vide");
    products = catalogSchema.parse(extractJsonArray(text));
  } catch (e) {
    console.error("[analyzeCatalogPdfAction] Échec de l'extraction IA :", e);
    return {
      success: false,
      error: "L'IA n'a pas réussi à analyser ce PDF. Vérifiez que c'est bien un catalogue lisible et réessayez.",
    };
  }

  if (products.length === 0) {
    return { success: false, error: "Aucun produit détecté dans ce document." };
  }

  const images: ExtractedImage[] = [];
  try {
    const rawImages = extractJpegImages(buffer, MAX_IMAGES);
    for (let i = 0; i < rawImages.length; i++) {
      try {
        const resized = await sharp(rawImages[i])
          .resize(500, 500, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 75 })
          .toBuffer();
        images.push({ index: i, dataUrl: `data:image/jpeg;base64,${resized.toString("base64")}` });
      } catch {
        // Faux positif du scan binaire (octets ressemblant à un JPEG sans en être un) — ignoré.
      }
    }
  } catch (e) {
    console.error("[analyzeCatalogPdfAction] Échec de l'extraction des images :", e);
    // Non bloquant : l'import continue sans photos.
  }

  return { success: true, products, images };
}

const importItemSchema = z.object({
  name: z.string().min(1),
  reference: z.string().optional(),
  unit: z.string().min(1).default("unité"),
  purchasePrice: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0).default(0),
  description: z.string().optional(),
  imageDataUrl: z.string().optional(),
});

export type ImportCatalogResult = {
  createdCount: number;
  skipped: { name: string; reason: string }[];
};

export async function importCatalogProductsAction(
  items: unknown
): Promise<{ success: true; result: ImportCatalogResult } | { success: false; error: string }> {
  const user = await requirePermission(PERMISSIONS.PRODUCTS_MANAGE);
  const enabled = await isFeatureEnabled(CATALOG_IMPORT_FLAG, user.businessId);
  if (!enabled) {
    return { success: false, error: "Cette fonctionnalité n'est pas encore activée pour votre compte." };
  }

  const parsed = z.array(importItemSchema).min(1).max(200).safeParse(items);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  const rows = parsed.data;

  const limit = await checkLimit(user.businessId, "products");
  const capacity = limit.limit === null ? rows.length : Math.max(0, limit.limit - limit.current);
  const toCreate = rows.slice(0, capacity);
  const overflow = rows.slice(capacity);
  const skipped: { name: string; reason: string }[] = overflow.map((r) => ({
    name: r.name,
    reason: "Limite de votre abonnement atteinte",
  }));

  const { data: existingProducts } = await supabase.from("products").select("reference, name").eq("business_id", user.businessId);
  const existingRefs = new Set(((existingProducts ?? []) as Array<{ reference: string }>).map((p) => p.reference.toLowerCase()));
  const existingNames = new Set(((existingProducts ?? []) as Array<{ name: string }>).map((p) => p.name.toLowerCase()));

  let createdCount = 0;
  for (const row of toCreate) {
    if (existingNames.has(row.name.toLowerCase())) {
      skipped.push({ name: row.name, reason: "Un produit du même nom existe déjà" });
      continue;
    }

    let reference = row.reference?.trim();
    if (!reference || existingRefs.has(reference.toLowerCase())) {
      reference = await generateProductReference(user.businessId);
    }

    let photoUrl: string | null = null;
    if (row.imageDataUrl?.startsWith("data:image/jpeg;base64,")) {
      const base64 = row.imageDataUrl.slice("data:image/jpeg;base64,".length);
      const result = await saveProductPhotoFromBuffer(Buffer.from(base64, "base64"), "image/jpeg");
      if ("url" in result) photoUrl = result.url;
    }

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        business_id: user.businessId,
        reference,
        name: row.name,
        unit: row.unit,
        purchase_price: row.purchasePrice,
        sale_price: row.salePrice,
        description: row.description ?? null,
        photo_url: photoUrl,
      })
      .select("id")
      .single();

    if (error || !product) {
      console.error("[importCatalogProductsAction] Échec de la création :", error?.message);
      skipped.push({ name: row.name, reason: "Erreur d'enregistrement" });
      continue;
    }

    existingRefs.add(reference.toLowerCase());
    existingNames.add(row.name.toLowerCase());
    createdCount++;
  }

  await logAction({
    businessId: user.businessId,
    userId: user.id,
    action: "CREATE",
    entity: "Product",
    details: `Import catalogue PDF : ${createdCount} produit(s)`,
  });

  revalidatePath("/produits");
  return { success: true, result: { createdCount, skipped } };
}

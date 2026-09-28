import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Pas de limite propre à ZINDO (images nettes, demande du propriétaire du 28/09) :
// seule la limite de Vercel (~4,5 Mo par requête) s'applique à ce chemin, d'où
// l'envoi direct du navigateur vers le stockage (createSignedImageUpload).
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const BUCKET = "uploads";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");
  return createClient(url, key);
}

export type SaveImageResult = { url: string } | { error: string };

/** Enregistre une image envoyée depuis un formulaire (caméra ou galerie) dans le bucket Supabase Storage "uploads/<folder>". */
async function saveImage(file: File, folder: string): Promise<SaveImageResult> {
  if (file.size === 0) return { error: "Fichier vide" };

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) return { error: "Format d'image non supporté (JPEG, PNG ou WebP uniquement)" };

  const path = `${folder}/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { error: "Échec de l'envoi de l'image" };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function saveProductPhoto(file: File) {
  return saveImage(file, "products");
}

/**
 * Variante de saveProductPhoto pour une image déjà décodée côté serveur (ex.
 * photo extraite d'un catalogue PDF importé, voir lib/actions/catalog-import.ts)
 * plutôt que reçue telle quelle depuis un <input type="file">.
 */
export async function saveProductPhotoFromBuffer(
  buffer: Buffer,
  contentType: "image/jpeg" | "image/png" | "image/webp"
): Promise<SaveImageResult> {
  if (buffer.length === 0) return { error: "Image vide" };

  const extension = ALLOWED_TYPES[contentType];
  const path = `products/${randomUUID()}.${extension}`;

  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) return { error: "Échec de l'envoi de l'image" };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function saveBusinessLogo(file: File) {
  return saveImage(file, "logos");
}

export async function saveOnlineStoreCoverPhoto(file: File) {
  return saveImage(file, "boutique-covers");
}

/** Supprime une ancienne image envoyée (remplacement ou suppression) — best-effort, ne bloque jamais. */
export async function deleteUploadedImage(url: string | null | undefined) {
  if (!url) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  try {
    const supabase = getSupabase();
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // fichier déjà absent ou Supabase non configuré — sans conséquence
  }
}

/** Logo et photo de couverture d'une boutique du Marché (flag nouveau_marche). */
export async function saveMarketShopImage(file: File) {
  return saveImage(file, "marche");
}

/** Dossiers où le navigateur peut envoyer une image directement (voir createImageUploadAction). */
export const DIRECT_UPLOAD_FOLDERS = ["products", "logos", "boutique-covers", "marche", "messages"] as const;
export type DirectUploadFolder = (typeof DIRECT_UPLOAD_FOLDERS)[number];

/**
 * Prépare un envoi direct navigateur → stockage, sans passer par Vercel (qui
 * refuse les requêtes de plus de ~4,5 Mo) : renvoie une adresse d'envoi signée,
 * à usage unique, et l'adresse publique que l'image aura ensuite.
 */
export async function createSignedImageUpload(folder: DirectUploadFolder, contentType: string) {
  const extension = ALLOWED_TYPES[contentType];
  if (!extension) return { error: "Format d'image non supporté (JPEG, PNG ou WebP uniquement)" } as const;
  const path = `${folder}/${randomUUID()}.${extension}`;
  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { error: "Échec de la préparation de l'envoi" } as const;
  return { signedUrl: data.signedUrl, publicUrl: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl } as const;
}

/**
 * Image déjà envoyée directement par le navigateur (champ caché « <name>UploadedUrl »
 * rempli par ImageUploadField). N'accepte qu'une adresse de notre propre stockage.
 */
export function uploadedImageUrl(formData: FormData, name: string): string | null {
  const value = formData.get(`${name}UploadedUrl`);
  return typeof value === "string" && isOwnUploadUrl(value) ? value : null;
}

/** Adresse d'une image de notre propre stockage (jamais une image extérieure). */
export function isOwnUploadUrl(value: string): boolean {
  const prefix = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  return value.startsWith(prefix) && /^[a-z-]+\/[0-9a-f-]+\.(jpg|png|webp)$/.test(value.slice(prefix.length));
}

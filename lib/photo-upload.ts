import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo
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
  if (file.size > MAX_SIZE_BYTES) return { error: "L'image dépasse 5 Mo" };

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
  if (buffer.length > MAX_SIZE_BYTES) return { error: "L'image dépasse 5 Mo" };

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

"use server";

import { requireUser } from "@/lib/auth";
import { createSignedImageUpload, DIRECT_UPLOAD_FOLDERS, type DirectUploadFolder } from "@/lib/photo-upload";

/** Adresse d'envoi signée pour qu'un commerçant connecté envoie une image directement au stockage. */
export async function createImageUploadAction(folder: string, contentType: string) {
  await requireUser();
  if (!DIRECT_UPLOAD_FOLDERS.includes(folder as DirectUploadFolder)) return { error: "Dossier non autorisé" };
  return createSignedImageUpload(folder as DirectUploadFolder, contentType);
}

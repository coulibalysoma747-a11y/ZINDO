"use client";

import { createImageUploadAction } from "@/lib/actions/image-upload";

type UploadTarget = { signedUrl: string; publicUrl: string } | { error: string };

/**
 * Envoie une image directement du navigateur vers le stockage ZINDO, sans
 * passer par Vercel (limité à ~4,5 Mo par requête) : l'image garde sa taille
 * et sa netteté. Renvoie son adresse publique, à transmettre au serveur dans
 * le champ « <nom>UploadedUrl » (voir uploadedImageUrl dans lib/photo-upload.ts).
 * `getTarget` fournit l'adresse d'envoi signée : commerçant par défaut, acheteur
 * du Marché pour la messagerie (createBuyerImageUploadAction).
 */
export async function uploadImageDirect(
  file: File,
  folder: "products" | "logos" | "boutique-covers" | "marche" | "messages",
  getTarget: (folder: string, contentType: string) => Promise<UploadTarget> = createImageUploadAction
): Promise<string> {
  const target = await getTarget(folder, file.type);
  if ("error" in target) throw new Error(target.error);
  const body = new FormData();
  body.append("cacheControl", "31536000");
  body.append("", file);
  const response = await fetch(target.signedUrl, { method: "PUT", body, headers: { "x-upsert": "false" } });
  if (!response.ok) throw new Error("Échec de l'envoi de l'image");
  return target.publicUrl;
}

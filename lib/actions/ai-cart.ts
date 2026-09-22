"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { createChatCompletion, isAssistantConfigured, type DeepSeekUserContentPart } from "@/lib/ai/deepseek";
import { searchProductsAction } from "@/lib/actions/product-search";

export type AiCartLine = {
  extractedName: string;
  quantity: number;
  productId: string | null;
  productName: string | null;
  unitPrice: number;
  photoUrl: string | null;
};

export type AiCartResult = { error: string } | { lines: AiCartLine[] };

const SYSTEM_PROMPT =
  "Tu lis la commande d'un client pour un commerce d'Afrique de l'Ouest (texte tapé, dicté, ou écrit à la main sur une photo). " +
  "Réponds UNIQUEMENT avec un JSON strict de cette forme, sans aucun texte autour : " +
  '{"items":[{"name":"nom du produit tel qu\'écrit/dit","quantity":<nombre>}]}. ' +
  "Une ligne par article. Si aucune quantité n'est précisée pour un article, mets 1. Ignore tout ce qui n'est pas un article à commander (salutations, dates, adresse...).";

function extractJson(raw: string): { items: Array<{ name: string; quantity: number }> } | null {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.items)) return parsed;
    return null;
  } catch {
    return null;
  }
}

type ExtractionResult =
  | { ok: false; error: string }
  | { ok: true; items: Array<{ name: string; quantity: number }> };

async function runExtraction(userContent: string | DeepSeekUserContentPart[]): Promise<ExtractionResult> {
  if (!isAssistantConfigured()) {
    return { ok: false, error: "L'assistant IA n'est pas configuré (clé manquante côté serveur)" };
  }
  let completion;
  try {
    completion = await createChatCompletion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      maxTokens: 1000,
    });
  } catch (e) {
    console.error("[ai-cart] Échec de l'appel DeepSeek :", e);
    return { ok: false, error: "L'IA n'a pas pu analyser la commande. Réessayez." };
  }

  const parsed = completion.content ? extractJson(completion.content) : null;
  if (!parsed) return { ok: false, error: "Réponse de l'IA illisible. Réessayez avec un texte ou une photo plus nette." };
  return { ok: true, items: parsed.items };
}

async function matchProducts(
  items: Array<{ name: string; quantity: number }>,
  locationId: string
): Promise<AiCartLine[]> {
  const lines: AiCartLine[] = [];
  for (const item of items.slice(0, 30)) {
    const matches = await searchProductsAction(item.name, locationId);
    const best = matches[0] ?? null;
    lines.push({
      extractedName: item.name,
      quantity: Math.max(1, Math.round(item.quantity) || 1),
      productId: best?.id ?? null,
      productName: best?.name ?? null,
      unitPrice: best?.salePrice ?? 0,
      photoUrl: best?.photoUrl ?? null,
    });
  }
  return lines;
}

/** "Panier IA" (Paramètres) : lit une commande tapée/dictée et propose une ligne de panier par article, à confirmer avant tout ajout réel. */
export async function parseOrderTextAction(text: string, locationId: string): Promise<AiCartResult> {
  await requirePermission(PERMISSIONS.SALES_CREATE);
  if (!text.trim()) return { error: "Rien à analyser" };

  const result = await runExtraction(text);
  if (!result.ok) return { error: result.error };
  return { lines: await matchProducts(result.items, locationId) };
}

/** Même chose à partir d'une photo (JPEG/PNG/WebP en data URI) — DeepSeek ne lit pas nativement les PDF. */
export async function parseOrderImageAction(imageDataUrl: string, locationId: string): Promise<AiCartResult> {
  await requirePermission(PERMISSIONS.SALES_CREATE);
  if (!imageDataUrl.startsWith("data:image/")) return { error: "Image invalide" };

  const result = await runExtraction([
    { type: "text", text: "Voici la photo de la commande à lire." },
    { type: "image_url", image_url: { url: imageDataUrl } },
  ]);
  if (!result.ok) return { error: result.error };
  return { lines: await matchProducts(result.items, locationId) };
}

"use server";

import { requireUser } from "@/lib/auth";
import { createChatCompletion, isAssistantConfigured, DeepSeekError, type DeepSeekMessage } from "@/lib/ai/deepseek";
import { NAV_ITEMS } from "@/lib/nav";
import { DESCRIPTIONS } from "@/app/(app)/support/ModulesGuide";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AskHelpAssistantResult = { success: true; reply: string } | { success: false; error: string };

// Notes sur des fonctionnalités qui vivent DANS une page (Paramètres, Profil)
// plutôt que d'avoir leur propre entrée de menu — donc absentes de
// DESCRIPTIONS (indexée par href de menu). Gardé à jour manuellement, comme
// DESCRIPTIONS elle-même.
const EXTRA_KNOWLEDGE = `
- Paramètres > Modules : le commerçant peut lui-même masquer/afficher chaque module optionnel (Devis, Réassort, Approvisionnement rapide, Caisse à deux...) sans rien supprimer de ses données.
- Paramètres > Caisse à deux : sépare la vente en deux rôles — un vendeur prépare un panier et clique « Envoyer à la caisse » (module Vente), un caissier séparé le récupère dans une file d'attente et finalise le paiement (module Caisse). Le stock n'est déduit qu'au paiement. Nécessite la permission « Encaisser depuis la file d'attente ».
- Paramètres > Panier IA : le caissier dépose une photo de la commande, la dicte ou la tape ; l'IA lit les articles et remplit le panier, à confirmer avant tout ajout réel.
- Paramètres > Intégrations API : génère une clé pour qu'un outil externe lise (en lecture seule) les produits, le stock, les ventes et les clients du commerce.
- Paramètres > Mobile Money et paiement mixte : personnalise les opérateurs mobile money proposés et autorise un paiement partagé espèces + mobile money.
- Paramètres > Zone de danger : vider certains historiques (ventes, achats...) du commerce, réservé à l'administrateur.
- Profil > Double authentification (2FA) : réservé à l'administrateur du commerce, ajoute un code à 6 chiffres (application d'authentification) en plus du mot de passe à la connexion, avec des codes de secours en cas de téléphone perdu.
- Profil > Notifications push : active des alertes sur l'appareil (nouvelle vente, stock bas/rupture, échéance de crédit dépassée) même quand ZINDO n'est pas ouvert.
- ZINDO fonctionne hors ligne pour l'écran de vente : les ventes s'enregistrent sur l'appareil et se synchronisent au retour de la connexion.
- ZINDO s'installe comme une application (PWA) directement depuis le navigateur, sur téléphone (Android/iOS) et sur ordinateur, sans passer par un store.
`.trim();

function buildKnowledgeBase(): string {
  const labelByHref = new Map(NAV_ITEMS.map((item) => [item.href, item.label]));
  const modules = Object.entries(DESCRIPTIONS)
    .map(([href, { long }]) => `- ${labelByHref.get(href) ?? href} (${href}) : ${long}`)
    .join("\n");
  return `${modules}\n\n${EXTRA_KNOWLEDGE}`;
}

/**
 * Assistant d'AIDE sur l'application ZINDO elle-même (« comment faire X »,
 * « où se trouve Y », « à quoi sert le module Z ») — à ne pas confondre avec
 * l'Assistant IA (lib/actions/assistant.ts) qui répond sur les DONNÉES du
 * commerce. Aucun accès à la base de données, aucun outil : uniquement le
 * texte ci-dessous, tenu à jour manuellement avec ModulesGuide.tsx. Ouvert à
 * tous les rôles (pas de permission ASSISTANT_USE) — aider à utiliser
 * l'application n'expose aucune donnée sensible du commerce.
 */
export async function askHelpAssistantAction(
  history: ChatMessage[],
  question: string
): Promise<AskHelpAssistantResult> {
  await requireUser();

  if (!isAssistantConfigured()) {
    return {
      success: false,
      error: "L'assistant d'aide n'est pas configuré. Ajoutez votre clé DEEPSEEK_API_KEY dans le fichier .env pour l'activer.",
    };
  }
  if (!question.trim()) {
    return { success: false, error: "Posez une question à l'assistant." };
  }

  const systemPrompt = `Tu es l'assistant d'aide de ZINDO, une application de gestion de stock et de ventes pour les commerces au Burkina Faso.
Tu réponds UNIQUEMENT à des questions sur l'utilisation de l'application ZINDO elle-même : comment faire telle action, où se trouve tel module, à quoi il sert.

Règles :
- Réponds toujours en français, de façon concise (quelques phrases), claire et pratique — donne le chemin dans le menu quand c'est utile (ex. « Paramètres > Modules »).
- Base-toi UNIQUEMENT sur la liste de modules et notes ci-dessous. N'invente jamais une fonctionnalité, un bouton ou un module qui n'y figure pas.
- Si la question porte sur les DONNÉES réelles du commerce (chiffre d'affaires, stock actuel, clients qui doivent de l'argent...), réponds que ce n'est pas ton rôle et renvoie vers l'Assistant IA (page /assistant), qui lui a accès à ces données.
- Si la question sort complètement du cadre de ZINDO, dis poliment que tu es limité à l'aide sur l'application.

Modules et fonctionnalités de ZINDO :
${buildKnowledgeBase()}`;

  const messages: DeepSeekMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m): DeepSeekMessage => ({ role: m.role, content: m.content })),
    { role: "user", content: question },
  ];

  try {
    const response = await createChatCompletion({ messages, maxTokens: 600 });
    if (response.finishReason === "content_filter" || !response.content) {
      return { success: false, error: "L'assistant n'a pas pu répondre à cette question. Essayez de la reformuler." };
    }
    return { success: true, reply: response.content };
  } catch (e) {
    if (e instanceof DeepSeekError) {
      console.error("[askHelpAssistantAction] Échec DeepSeek :", e.message);
      return { success: false, error: "L'assistant d'aide est momentanément indisponible. Réessayez dans un instant." };
    }
    console.error("[askHelpAssistantAction] Erreur inattendue :", e);
    return { success: false, error: "Une erreur inattendue est survenue." };
  }
}

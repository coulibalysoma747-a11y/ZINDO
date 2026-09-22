"use server";

import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentLocation } from "@/lib/location";
import { createChatCompletion, isAssistantConfigured, DeepSeekError, type DeepSeekMessage } from "@/lib/ai/deepseek";
import { ASSISTANT_TOOLS, createToolExecutor } from "@/lib/ai/tools";
import { MEDICAL_ASSISTANT_TOOLS, createMedicalToolExecutor } from "@/lib/ai/medical-tools";
import { MEDICAL_ACTIVITY_KEY } from "@/lib/nav";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AskAssistantResult = { success: true; reply: string } | { success: false; error: string };

const MAX_TOOL_ITERATIONS = 6;

export async function askAssistantAction(
  history: ChatMessage[],
  question: string
): Promise<AskAssistantResult> {
  const user = await requirePermission(PERMISSIONS.ASSISTANT_USE);

  if (!isAssistantConfigured()) {
    return {
      success: false,
      error: "L'assistant IA n'est pas configuré. Ajoutez votre clé DEEPSEEK_API_KEY dans le fichier .env pour l'activer.",
    };
  }

  if (!question.trim()) {
    return { success: false, error: "Posez une question à l'assistant." };
  }

  // Cabinet médical/clinique n'a ni caisse ni stock au sens des autres
  // activités (les consultations ne sont pas rattachées à une boutique) :
  // outils et message système dédiés plutôt que ceux pensés pour une
  // boutique — voir docs/cahier-des-charges-cabinet-medical.md §8.
  const isMedical = user.business.activityKey === MEDICAL_ACTIVITY_KEY;

  let tools = ASSISTANT_TOOLS;
  let executeTool: (name: string, input: Record<string, unknown>) => Promise<string>;
  let systemPrompt: string;

  if (isMedical) {
    tools = MEDICAL_ASSISTANT_TOOLS;
    executeTool = createMedicalToolExecutor(user.businessId);
    systemPrompt = `Tu es l'assistant intelligent de ZINDO, une application de gestion pour les commerces et cabinets au Burkina Faso.
Tu aides ${user.firstName}, du cabinet "${user.business.name}", à comprendre l'activité de son cabinet médical (consultations, pathologies, actes, patientèle, bilan financier).

Règles :
- Réponds toujours en français, de façon concise et actionnable (quelques phrases, jamais un essai).
- Utilise systématiquement les outils fournis pour obtenir des données réelles avant de répondre — ne devine jamais de chiffres.
- Les montants sont en ${user.business.currency}. Formate-les avec des espaces comme séparateurs de milliers (ex : 125 000 ${user.business.currency}).
- Ne mentionne jamais de nom ni de donnée nominative de patient : les outils ne renvoient que des statistiques agrégées, respecte cette anonymisation dans tes réponses aussi (secret médical).
- Si une question sort du cadre de l'activité du cabinet (consultations, diagnostics, actes, patientèle, bilan financier), réponds poliment que tu es limité à ces sujets.
- Sois précis et cite des chiffres concrets issus des outils plutôt que des généralités.`;
  } else {
    const currentLocation = await getCurrentLocation(user.businessId);
    if (!currentLocation) {
      return { success: false, error: "Configurez d'abord une boutique pour utiliser l'assistant." };
    }
    executeTool = createToolExecutor(user.businessId, currentLocation.id, user.business.currency);
    systemPrompt = `Tu es l'assistant commercial intelligent de ZINDO, une application de gestion de stock et de ventes pour les commerces au Burkina Faso.
Tu aides ${user.firstName}, gérant de "${user.business.name}", à comprendre les performances de sa boutique "${currentLocation.name}".

Règles :
- Réponds toujours en français, de façon concise et actionnable (quelques phrases, jamais un essai).
- Utilise systématiquement les outils fournis pour obtenir des données réelles avant de répondre — ne devine jamais de chiffres.
- Les montants sont en ${user.business.currency}. Formate-les avec des espaces comme séparateurs de milliers (ex : 125 000 ${user.business.currency}).
- Si une question sort du cadre de la gestion du commerce (stock, ventes, clients, marges, crédits), réponds poliment que tu es limité à ces sujets.
- Sois précis et cite des chiffres concrets issus des outils plutôt que des généralités.`;
  }

  const messages: DeepSeekMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m): DeepSeekMessage => ({ role: m.role, content: m.content })),
    { role: "user", content: question },
  ];

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await createChatCompletion({
        messages,
        tools,
        maxTokens: 2000,
      });

      if (response.finishReason === "content_filter") {
        return {
          success: false,
          error: "L'assistant n'a pas pu répondre à cette question. Essayez de la reformuler.",
        };
      }

      if (response.finishReason !== "tool_calls" || response.toolCalls.length === 0) {
        const text = (response.content ?? "").trim();
        return { success: true, reply: text || "Je n'ai pas pu générer de réponse." };
      }

      messages.push({ role: "assistant", content: response.content, tool_calls: response.toolCalls });

      for (const call of response.toolCalls) {
        let input: Record<string, unknown> = {};
        try {
          input = JSON.parse(call.function.arguments || "{}");
        } catch {
          // arguments malformés — l'outil reçoit un objet vide plutôt que de faire échouer tout le tour
        }
        const result = await executeTool(call.function.name, input);
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
    }

    return {
      success: false,
      error: "L'assistant n'a pas pu conclure son analyse. Essayez de reformuler votre question.",
    };
  } catch (error) {
    if (error instanceof DeepSeekError) {
      if (error.status === 401) return { success: false, error: "Clé API DeepSeek invalide. Vérifiez DEEPSEEK_API_KEY dans .env." };
      if (error.status === 429) return { success: false, error: "Trop de requêtes vers l'assistant IA. Réessayez dans un instant." };
      return { success: false, error: `Erreur de l'assistant IA : ${error.message}` };
    }
    console.error("[askAssistantAction] Erreur inattendue :", error);
    return { success: false, error: "Une erreur inattendue est survenue." };
  }
}

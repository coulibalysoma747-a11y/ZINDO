"use server";

import Anthropic from "@anthropic-ai/sdk";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCurrentLocation } from "@/lib/location";
import { getAnthropicClient, ASSISTANT_MODEL, isAssistantConfigured } from "@/lib/ai/client";
import { ASSISTANT_TOOLS, createToolExecutor } from "@/lib/ai/tools";

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
      error:
        "L'assistant IA n'est pas configuré. Ajoutez votre clé ANTHROPIC_API_KEY dans le fichier .env pour l'activer.",
    };
  }

  const currentLocation = await getCurrentLocation(user.businessId);
  if (!currentLocation) {
    return { success: false, error: "Configurez d'abord une boutique pour utiliser l'assistant." };
  }

  if (!question.trim()) {
    return { success: false, error: "Posez une question à l'assistant." };
  }

  const client = getAnthropicClient();
  const executeTool = createToolExecutor(user.businessId, currentLocation.id, user.business.currency);

  const systemPrompt = `Tu es l'assistant commercial intelligent de ZINDO, une application de gestion de stock et de ventes pour les commerces au Burkina Faso.
Tu aides ${user.firstName}, gérant de "${user.business.name}", à comprendre les performances de sa boutique "${currentLocation.name}".

Règles :
- Réponds toujours en français, de façon concise et actionnable (quelques phrases, jamais un essai).
- Utilise systématiquement les outils fournis pour obtenir des données réelles avant de répondre — ne devine jamais de chiffres.
- Les montants sont en ${user.business.currency}. Formate-les avec des espaces comme séparateurs de milliers (ex : 125 000 ${user.business.currency}).
- Si une question sort du cadre de la gestion du commerce (stock, ventes, clients, marges, crédits), réponds poliment que tu es limité à ces sujets.
- Sois précis et cite des chiffres concrets issus des outils plutôt que des généralités.`;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.content })),
    { role: "user", content: question },
  ];

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: ASSISTANT_MODEL,
        max_tokens: 2048,
        output_config: { effort: "medium" },
        system: systemPrompt,
        tools: ASSISTANT_TOOLS,
        messages,
      });

      if (response.stop_reason !== "tool_use") {
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return { success: true, reply: text || "Je n'ai pas pu générer de réponse." };
      }

      messages.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        const result = await executeTool(block.name, block.input as Record<string, unknown>);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
      messages.push({ role: "user", content: toolResults });
    }

    return {
      success: false,
      error: "L'assistant n'a pas pu conclure son analyse. Essayez de reformuler votre question.",
    };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { success: false, error: "Clé API Anthropic invalide. Vérifiez ANTHROPIC_API_KEY dans .env." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { success: false, error: "Trop de requêtes vers l'assistant IA. Réessayez dans un instant." };
    }
    if (error instanceof Anthropic.APIError) {
      return { success: false, error: `Erreur de l'assistant IA : ${error.message}` };
    }
    return { success: false, error: "Une erreur inattendue est survenue." };
  }
}

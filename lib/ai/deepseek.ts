import "server-only";

// Client pour l'assistant IA commercial (chat + outils), exclusivement —
// voir lib/actions/assistant.ts. L'import PDF par IA (lib/actions/catalog-import.ts,
// qui a besoin d'analyser des images de pages de catalogue) reste sur
// Claude/Anthropic (lib/ai/client.ts) : les deux clients sont volontairement
// séparés pour ne jamais faire dépendre l'un de la configuration de l'autre.
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

// "deepseek-flash" (rapide, économique) suffit pour appeler des outils et
// résumer leur résultat en quelques phrases — passer à "deepseek-v4-pro" ici
// si une analyse plus fine s'avère nécessaire.
export const ASSISTANT_MODEL = "deepseek-flash";

export function isAssistantConfigured() {
  return !!process.env.DEEPSEEK_API_KEY;
}

export type DeepSeekTool = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type DeepSeekToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type DeepSeekMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: DeepSeekToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export class DeepSeekError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "DeepSeekError";
  }
}

/** Un tour de la conversation — l'appelant boucle lui-même tant que finishReason === "tool_calls". */
export async function createChatCompletion(params: {
  messages: DeepSeekMessage[];
  tools?: DeepSeekTool[];
  maxTokens?: number;
}): Promise<{ content: string | null; toolCalls: DeepSeekToolCall[]; finishReason: string }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY n'est pas configurée.");

  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: ASSISTANT_MODEL,
      messages: params.messages,
      tools: params.tools,
      max_tokens: params.maxTokens ?? 2000,
      // Le raisonnement étendu ("thinking") est activé par défaut côté
      // DeepSeek et partage son budget avec max_tokens — même piège que
      // Claude Opus 5 (voir l'historique de ce fichier) : désactivé ici,
      // cet assistant n'a besoin que d'appeler des outils puis résumer,
      // jamais de longues chaînes de raisonnement.
      thinking: { type: "disabled" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Erreur DeepSeek (${res.status})`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      message = body?.error?.message ?? message;
    } catch {
      // réponse d'erreur sans corps JSON exploitable
    }
    throw new DeepSeekError(res.status, message);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: { content?: string | null; tool_calls?: DeepSeekToolCall[] };
      finish_reason?: string;
    }>;
  };
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content ?? null,
    toolCalls: choice?.message?.tool_calls ?? [],
    finishReason: choice?.finish_reason ?? "stop",
  };
}

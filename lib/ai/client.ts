import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export function isAssistantConfigured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;

export function getAnthropicClient() {
  if (!isAssistantConfigured()) {
    throw new Error("ANTHROPIC_API_KEY n'est pas configurée.");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export const ASSISTANT_MODEL = "claude-opus-5";

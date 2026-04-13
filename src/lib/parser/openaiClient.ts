// abstract: OpenAI client for converting natural-language hand prompts into structured JSON.
// out_of_scope: Prompt schema validation and UI state management.

import type { PromptModelClient } from "./promptParser";

interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4.1-mini";

const SYSTEM_PROMPT = [
  "You extract a Texas Hold'em hand into strict JSON.",
  "Return JSON only (no markdown fence, no explanation).",
  "Required fields:",
  "handId, players[], potSize, actions[].",
  "Each action must include street, actorId, action, and optional amount.",
  "Allowed street: preflop, flop, turn, river.",
  "Allowed action: fold, check, call, bet, raise, all_in."
].join(" ");

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? match[0] : trimmed;
}

export function createOpenAIPromptClient(config: OpenAIConfig): PromptModelClient {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const model = config.model ?? DEFAULT_MODEL;

  return {
    async extract(prompt: string): Promise<unknown> {
      if (!config.apiKey.trim()) {
        throw new Error("OpenAI API key is required for prompt parsing.");
      }
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned empty content.");
      }

      return JSON.parse(extractJsonObject(content));
    }
  };
}

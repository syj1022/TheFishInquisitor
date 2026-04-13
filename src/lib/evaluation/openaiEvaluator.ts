// abstract: OpenAI-backed global hand evaluator that returns structured verdict and rationale JSON.
// out_of_scope: Commentary phrase selection and browser voice playback.

import type { CritiqueEngineMode, EvaluationResult, HandScenario, InfoMode } from "../../types/poker";

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

interface OpenAIEvaluationClient {
  mode: CritiqueEngineMode;
  evaluate: (scenario: HandScenario, targetPlayerId: string, mode: InfoMode) => Promise<EvaluationResult>;
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4.1-mini";

const SYSTEM_PROMPT = [
  "You are a strict Texas Hold'em evaluator focused on GTO-first analysis.",
  "Use the full action timeline globally, then judge only the target player in context.",
  "Return JSON only with keys:",
  "verdict (good|questionable|bad), severity (0-3), summary (string), rationale (string[] max 4), alternativeLine (string optional).",
  "No markdown, no extra keys."
].join(" ");

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? match[0] : trimmed;
}

function sanitizeResult(targetPlayerId: string, payload: unknown): EvaluationResult {
  const data = (payload ?? {}) as Record<string, unknown>;
  const verdict =
    data.verdict === "good" || data.verdict === "questionable" || data.verdict === "bad"
      ? data.verdict
      : "questionable";
  const severityRaw = Number(data.severity);
  const severity = Number.isInteger(severityRaw) ? Math.min(3, Math.max(0, severityRaw)) : 2;
  const summary = typeof data.summary === "string" && data.summary.trim().length > 0
    ? data.summary.trim()
    : "OpenAI evaluation summary is unavailable.";
  const rationale = Array.isArray(data.rationale)
    ? data.rationale.filter((item): item is string => typeof item === "string").slice(0, 4)
    : [];
  const alternativeLine =
    typeof data.alternativeLine === "string" && data.alternativeLine.trim().length > 0
      ? data.alternativeLine.trim()
      : undefined;

  return {
    targetPlayerId,
    verdict,
    severity: severity as 0 | 1 | 2 | 3,
    summary,
    rationale: rationale.length > 0 ? rationale : ["OpenAI returned no rationale points."],
    alternativeLine
  };
}

export function createOpenAIEvaluationClient(config: OpenAIConfig): OpenAIEvaluationClient {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const model = config.model ?? DEFAULT_MODEL;

  return {
    mode: "openai_global",
    async evaluate(scenario: HandScenario, targetPlayerId: string, mode: InfoMode): Promise<EvaluationResult> {
      if (!config.apiKey.trim()) {
        throw new Error("OpenAI API key is required for OpenAI global evaluation.");
      }

      const userPayload = {
        targetPlayerId,
        infoMode: mode,
        scenario
      };

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
            { role: "user", content: JSON.stringify(userPayload) }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI returned empty evaluation content.");
      }

      return sanitizeResult(targetPlayerId, JSON.parse(extractJsonObject(content)));
    }
  };
}

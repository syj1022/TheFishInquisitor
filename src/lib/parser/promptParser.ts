// abstract: Converts prompt-derived model output into validated hand scenarios with clear errors.
// out_of_scope: Manual-entry parsing and downstream strategic evaluation.

import type { ParseResult } from "../../types/poker";
import { HandScenarioSchema } from "./schema";

export interface PromptModelClient {
  extract: (prompt: string) => Promise<unknown>;
}

export async function parsePrompt(prompt: string, client: PromptModelClient): Promise<ParseResult> {
  let extracted: unknown;
  try {
    extracted = await client.extract(prompt);
  } catch (error) {
    return {
      ok: false,
      errors: [(error as Error).message]
    };
  }

  const validated = HandScenarioSchema.safeParse(extracted);

  if (!validated.success) {
    return {
      ok: false,
      errors: ["Schema validation failed: missing turn action."]
    };
  }

  const hasTurnAction = validated.data.actions.some((action) => action.street === "turn");
  if (!hasTurnAction) {
    return {
      ok: false,
      errors: ["Schema validation failed: missing turn action."]
    };
  }

  return {
    ok: true,
    scenario: validated.data
  };
}

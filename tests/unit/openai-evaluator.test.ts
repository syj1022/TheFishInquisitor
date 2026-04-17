// abstract: Unit tests for OpenAI global evaluator response parsing and validation.
// out_of_scope: UI wiring and browser voice playback.

import { createOpenAIEvaluationClient } from "../../src/lib/evaluation/openaiEvaluator";
import type { HandScenario } from "../../src/types/poker";

const SAMPLE_SCENARIO: HandScenario = {
  handId: "h-ds-1",
  players: [
    { id: "p1", name: "Hero", stack: 100, position: "BTN" },
    { id: "p2", name: "Villain", stack: 100, position: "BB" }
  ],
  potSize: 3,
  actions: [{ street: "preflop", actorId: "p1", action: "raise", amount: 2.5 }]
};

test("parses OpenAI JSON result into EvaluationResult", async () => {
  const fetchMock = vi.fn(async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              verdict: "questionable",
              severity: 2,
              summary: "Global line has marginal overplay.",
              rationale: ["Action 1 sizing is too large for the current pot."],
              alternativeLine: "Prefer smaller sizing."
            })
          }
        }
      ]
    })
  }));
  vi.stubGlobal(
    "fetch",
    fetchMock
  );

  const client = createOpenAIEvaluationClient({ apiKey: "sk-test" });
  const result = await client.evaluate(SAMPLE_SCENARIO, "p1", "revealed_cards");

  expect(result.targetPlayerId).toBe("p1");
  expect(result.verdict).toBe("questionable");
  expect(result.rationale[0]).toContain("Action 1");
  const [, rawInit] = fetchMock.mock.calls[0] ?? [];
  const body = JSON.parse(String((rawInit as RequestInit).body));
  const userPayload = JSON.parse(body.messages[1].content);
  expect(userPayload.strictShowdown.status).toBe("incomplete_cards");
});

test("throws when openai response is not ok", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: false,
      status: 401,
      statusText: "Unauthorized"
    }))
  );

  const client = createOpenAIEvaluationClient({ apiKey: "sk-test" });
  await expect(client.evaluate(SAMPLE_SCENARIO, "p1", "revealed_cards")).rejects.toThrow(
    "OpenAI request failed: 401 Unauthorized"
  );
});

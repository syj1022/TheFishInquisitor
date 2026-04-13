// abstract: Unit tests for prompt-to-scenario parsing with strict schema validation.
// out_of_scope: UI rendering concerns and strategy-evaluation scoring.

import { parsePrompt } from "../../src/lib/parser/promptParser";

test("returns actionable errors when model output breaks schema", async () => {
  const fakeClient = {
    extract: async () => ({
      handId: "h-prompt-1",
      players: [{ id: "p1", name: "Hero", stack: 100, position: "BTN" }],
      potSize: 3
    })
  };

  const result = await parsePrompt("messy hand text", fakeClient);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors[0]).toContain("missing turn action");
  }
});

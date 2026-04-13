// abstract: Unit tests for manual hand input normalization into canonical scenario.
// out_of_scope: Prompt parsing and evaluator scoring behavior.

import { parseManualInput } from "../../src/lib/parser/manualParser";
import type { ManualInputDraft } from "../../src/types/poker";

test("normalizes ordered manual actions into HandScenario", () => {
  const fixture: ManualInputDraft = {
    handId: "h-1",
    players: [
      { id: "p1", name: "Hero", stack: 100, position: "BTN" },
      { id: "p2", name: "Villain", stack: 100, position: "BB" }
    ],
    potSize: 3,
    actions: [
      { street: "preflop", actorId: "p1", action: "raise", amount: 2.5 },
      { street: "preflop", actorId: "p2", action: "call", amount: 2.5 }
    ]
  };

  const result = parseManualInput(fixture);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.scenario.actions).toHaveLength(2);
  }
});

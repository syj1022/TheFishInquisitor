// abstract: Unit tests for rule heuristic verdict mapping and evaluator contracts.
// out_of_scope: Prompt parsing and commentary text generation.

import { createRuleHeuristicEngine } from "../../src/lib/evaluation/ruleHeuristicEngine";
import type { HandScenario } from "../../src/types/poker";

test("maps weighted rule penalties to questionable verdict", () => {
  const engine = createRuleHeuristicEngine();
  const scenario: HandScenario = {
    handId: "h-eval-1",
    players: [
      { id: "p1", name: "Hero", stack: 30, position: "BTN" },
      { id: "p2", name: "Villain", stack: 100, position: "BB" }
    ],
    potSize: 12,
    actions: [
      { street: "turn", actorId: "p1", action: "call", amount: 18 }
    ]
  };

  const result = engine.evaluate(scenario, "p1", "revealed_cards");
  expect(result.verdict).toBe("questionable");
});

test("uses full action timeline context when judging target action", () => {
  const engine = createRuleHeuristicEngine();
  const scenario: HandScenario = {
    handId: "h-eval-2",
    players: [
      { id: "p1", name: "Hero", stack: 100, position: "BTN" },
      { id: "p2", name: "VillainA", stack: 100, position: "SB" },
      { id: "p3", name: "VillainB", stack: 100, position: "BB" }
    ],
    potSize: 6,
    actions: [
      { street: "preflop", actorId: "p2", action: "raise", amount: 4 },
      { street: "preflop", actorId: "p3", action: "fold" },
      { street: "preflop", actorId: "p1", action: "call", amount: 4 },
      { street: "flop", actorId: "p2", action: "bet", amount: 40 },
      { street: "flop", actorId: "p1", action: "call", amount: 40 }
    ]
  };

  const result = engine.evaluate(scenario, "p1", "revealed_cards");
  expect(result.verdict).toBe("questionable");
  expect(result.rationale.some((line) => line.includes("flop"))).toBe(true);
});

test("includes strict winner note when showdown cards are complete", () => {
  const engine = createRuleHeuristicEngine();
  const scenario: HandScenario = {
    handId: "h-eval-3",
    players: [
      { id: "p1", name: "Hero", stack: 100, position: "BTN" },
      { id: "p2", name: "Villain", stack: 100, position: "BB" }
    ],
    potSize: 3,
    actions: [],
    board: {
      flop: ["Ah", "Kd", "Qc"],
      turn: "2s",
      river: "3h"
    },
    holeCards: {
      p1: ["As", "Ad"],
      p2: ["Ks", "Kc"]
    }
  };

  const result = engine.evaluate(scenario, "p1", "revealed_cards");
  expect(result.rationale.some((line) => line.includes("Strict winner check"))).toBe(true);
  expect(result.rationale.some((line) => line.includes("target wins"))).toBe(true);
});

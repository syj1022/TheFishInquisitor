// abstract: Unit tests for style-constrained short commentary generation.
// out_of_scope: Voice synthesis behavior and UI rendering contracts.

import { APPROVED_LINES, buildRoastLine } from "../../src/lib/commentary/styleCommentary";
import type { EvaluationResult, HandScenario } from "../../src/types/poker";

test("commentary short line is selected from approved phrase inventory", () => {
  const scenario: HandScenario = {
    handId: "style-1",
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
      p1: ["As", "Td"],
      p2: ["Ks", "Kc"]
    }
  };
  const result: EvaluationResult = {
    targetPlayerId: "p1",
    verdict: "questionable",
    severity: 2,
    summary: "Line shows leaks against pot-odds and stack-pressure heuristics.",
    rationale: ["Call size is too large relative to the pot."]
  };

  const line = buildRoastLine(result, scenario, () => 0);
  expect(APPROVED_LINES).toContain(line);
});

test("triggers strong-hand win line pool for AT+ and scoop", () => {
  const scenario: HandScenario = {
    handId: "style-2",
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
      p1: ["As", "Td"],
      p2: ["Ks", "Qd"]
    }
  };
  const result: EvaluationResult = {
    targetPlayerId: "p1",
    verdict: "good",
    severity: 1,
    summary: "Strong line.",
    rationale: ["No major heuristic penalties were triggered."]
  };

  const line = buildRoastLine(result, scenario, () => 0);
  expect(line).toBe("你咋把把有牌呀");
});

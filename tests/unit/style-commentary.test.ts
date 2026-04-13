// abstract: Unit tests for style-constrained short commentary generation.
// out_of_scope: Voice synthesis behavior and UI rendering contracts.

import { APPROVED_LINES, buildRoastLine } from "../../src/lib/commentary/styleCommentary";
import type { EvaluationResult } from "../../src/types/poker";

test("commentary short line is selected from approved phrase inventory", () => {
  const result: EvaluationResult = {
    targetPlayerId: "p1",
    verdict: "questionable",
    severity: 2,
    summary: "Line shows leaks against pot-odds and stack-pressure heuristics.",
    rationale: ["Call size is too large relative to the pot."]
  };

  const line = buildRoastLine(result);
  expect(APPROVED_LINES).toContain(line);
});

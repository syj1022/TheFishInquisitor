// abstract: Unit tests for strict Texas Hold'em winner computation behavior.
// out_of_scope: Strategy verdict scoring and commentary phrase selection.

import { computeStrictShowdown } from "../../src/lib/evaluation/winner";
import type { HandScenario } from "../../src/types/poker";

test("computes single showdown winner from full board and hole cards", () => {
  const scenario: HandScenario = {
    handId: "winner-1",
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

  const result = computeStrictShowdown(scenario);
  expect(result.status).toBe("resolved");
  expect(result.byFold).toBe(false);
  expect(result.winnerIds).toEqual(["p1"]);
});

test("computes ties when players share board best hand", () => {
  const scenario: HandScenario = {
    handId: "winner-2",
    players: [
      { id: "p1", name: "Hero", stack: 100, position: "BTN" },
      { id: "p2", name: "Villain", stack: 100, position: "BB" }
    ],
    potSize: 3,
    actions: [],
    board: {
      flop: ["Ah", "Kd", "Qc"],
      turn: "Js",
      river: "Tc"
    },
    holeCards: {
      p1: ["2s", "3s"],
      p2: ["4d", "5d"]
    }
  };

  const result = computeStrictShowdown(scenario);
  expect(result.status).toBe("resolved");
  expect(result.winnerIds.sort()).toEqual(["p1", "p2"]);
});

test("resolves winner by fold without requiring showdown cards", () => {
  const scenario: HandScenario = {
    handId: "winner-3",
    players: [
      { id: "p1", name: "Hero", stack: 100, position: "BTN" },
      { id: "p2", name: "Villain", stack: 100, position: "BB" }
    ],
    potSize: 3,
    actions: [{ street: "preflop", actorId: "p2", action: "fold" }]
  };

  const result = computeStrictShowdown(scenario);
  expect(result.status).toBe("resolved");
  expect(result.byFold).toBe(true);
  expect(result.winnerIds).toEqual(["p1"]);
});

test("returns incomplete_cards when multiple active players reach showdown with missing board", () => {
  const scenario: HandScenario = {
    handId: "winner-4",
    players: [
      { id: "p1", name: "Hero", stack: 100, position: "BTN" },
      { id: "p2", name: "Villain", stack: 100, position: "BB" }
    ],
    potSize: 3,
    actions: [],
    board: {
      flop: ["Ah", "Kd", "Qc"]
    },
    holeCards: {
      p1: ["2s", "3s"],
      p2: ["4d", "5d"]
    }
  };

  const result = computeStrictShowdown(scenario);
  expect(result.status).toBe("incomplete_cards");
  expect(result.reason).toContain("Showdown requires");
});

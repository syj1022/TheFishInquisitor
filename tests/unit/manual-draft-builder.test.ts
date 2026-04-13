// abstract: Unit tests for serializing manual builder draft state into parser-ready payloads.
// out_of_scope: UI rendering behavior and prompt-based extraction path.

import { buildManualInputDraft, type ActionsByStreet } from "../../src/lib/manual/manualDraftBuilder";

test("serializes player, board, and actions into ManualInputDraft", () => {
  const actions: ActionsByStreet = {
    preflop: [{ actorId: "p1", action: "raise", amount: "2.5" }],
    flop: [],
    turn: [],
    river: []
  };

  const result = buildManualInputDraft({
    handId: "h-manual-1",
    players: [
      { name: "Hero", position: "BTN", stack: "100", holeCards: ["As", "Kd"] },
      { name: "Villain", position: "BB", stack: "100", holeCards: ["7c", "7d"] }
    ],
    board: { flop: [undefined, undefined, undefined], turn: undefined, river: undefined },
    potSize: "3",
    actionsByStreet: actions
  });

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.draft.actions).toHaveLength(1);
    expect(result.draft.actions[0].street).toBe("preflop");
    expect(result.draft.holeCards?.p1?.[0]).toBe("As");
  }
});

test("rejects amount-required actions when amount is missing", () => {
  const actions: ActionsByStreet = {
    preflop: [{ actorId: "p1", action: "raise", amount: "" }],
    flop: [],
    turn: [],
    river: []
  };

  const result = buildManualInputDraft({
    handId: "h-manual-2",
    players: [
      { name: "Hero", position: "BTN", stack: "100", holeCards: ["As", "Kd"] },
      { name: "Villain", position: "BB", stack: "100", holeCards: ["7c", "7d"] }
    ],
    board: { flop: [undefined, undefined, undefined], turn: undefined, river: undefined },
    potSize: "3",
    actionsByStreet: actions
  });

  expect(result.ok).toBe(false);
});

test("auto-fills all-in amount from remaining stack", () => {
  const actions: ActionsByStreet = {
    preflop: [
      { actorId: "p2", action: "call", amount: "2" },
      { actorId: "p1", action: "raise", amount: "8" },
      { actorId: "p2", action: "all_in", amount: "" }
    ],
    flop: [],
    turn: [],
    river: []
  };

  const result = buildManualInputDraft({
    handId: "h-manual-4",
    players: [
      { name: "Hero", position: "BTN", stack: "100", holeCards: ["As", "Kd"] },
      { name: "Villain", position: "BB", stack: "100", holeCards: ["7c", "7d"] }
    ],
    board: { flop: [undefined, undefined, undefined], turn: undefined, river: undefined },
    potSize: "3",
    actionsByStreet: actions
  });

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.draft.actions[2].action).toBe("all_in");
    expect(result.draft.actions[2].amount).toBe(98);
  }
});

test("omits rows with none action from serialized actions", () => {
  const actions: ActionsByStreet = {
    preflop: [{ actorId: "p1", action: "none" as never, amount: "" }],
    flop: [],
    turn: [],
    river: []
  };

  const result = buildManualInputDraft({
    handId: "h-manual-3",
    players: [
      { name: "Hero", position: "BTN", stack: "100", holeCards: ["As", "Kd"] },
      { name: "Villain", position: "BB", stack: "100", holeCards: ["7c", "7d"] }
    ],
    board: { flop: [undefined, undefined, undefined], turn: undefined, river: undefined },
    potSize: "3",
    actionsByStreet: actions
  });

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.draft.actions).toHaveLength(0);
  }
});

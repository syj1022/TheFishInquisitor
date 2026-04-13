// abstract: Normalizes and validates manual hand-entry payloads into a canonical scenario.
// out_of_scope: Natural-language prompt parsing and solver-backed interpretation.

import type { ManualInputDraft, ParseResult, Street } from "../../types/poker";

const STREET_ORDER: Record<Street, number> = {
  preflop: 0,
  flop: 1,
  turn: 2,
  river: 3
};

export function parseManualInput(input: ManualInputDraft): ParseResult {
  const errors: string[] = [];

  if (!input.handId.trim()) {
    errors.push("handId is required.");
  }
  if (input.players.length < 2) {
    errors.push("At least two players are required.");
  }
  if (input.potSize <= 0) {
    errors.push("Pot size must be positive.");
  }

  const playerIds = new Set(input.players.map((player) => player.id));
  let previousStreet = -1;

  for (const action of input.actions) {
    const streetRank = STREET_ORDER[action.street];
    if (!Number.isInteger(streetRank)) {
      errors.push(`Unsupported street value: ${action.street}`);
      continue;
    }

    if (streetRank < previousStreet) {
      errors.push("Actions must follow street order from preflop to river.");
      break;
    }
    previousStreet = streetRank;

    if (!playerIds.has(action.actorId)) {
      errors.push(`Action actor '${action.actorId}' is not in players list.`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    scenario: {
      handId: input.handId,
      players: input.players,
      potSize: input.potSize,
      actions: input.actions,
      board: input.board,
      holeCards: input.holeCards
    }
  };
}

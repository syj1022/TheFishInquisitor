// abstract: Serializer that converts manual builder draft state into parser-ready manual input payloads.
// out_of_scope: Rendering concerns and asynchronous prompt-model parsing.

import type { ActionDraft, ActionsByStreet } from "../../components/manual/StreetActionsEditor";
import type { BoardDraft } from "../../components/manual/BoardCardPicker";
import type { ManualInputDraft, PlayerAction, TablePosition } from "../../types/poker";

type PlayerBuilderDraft = {
  name: string;
  position: TablePosition;
  stack: string;
  holeCards: [string | undefined, string | undefined];
};

interface BuildManualInputDraftParams {
  handId: string;
  players: PlayerBuilderDraft[];
  board: BoardDraft;
  potSize: string;
  actionsByStreet: ActionsByStreet;
}

type BuildResult =
  | { ok: true; draft: ManualInputDraft }
  | { ok: false; errors: string[] };

const AMOUNT_REQUIRED_ACTIONS = new Set<PlayerAction>(["call", "bet", "raise"]);

function parsePositiveNumber(raw: string, field: string, errors: string[]): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    errors.push(`${field} must be a positive number.`);
  }
  return parsed;
}

function serializeStreet(
  street: "preflop" | "flop" | "turn" | "river",
  rows: ActionDraft[],
  stacksByActor: Map<string, number>,
  committedByActor: Map<string, number>,
  errors: string[]
) {
  return rows
    .map((row, index) => {
      if (row.action === "none") {
        return null;
      }

      const action = row.action as PlayerAction;
      if (!row.actorId) {
        errors.push(`${street} action ${index + 1} actor is required.`);
      }

      let amount: number | undefined;
      if (action === "all_in") {
        const stack = stacksByActor.get(row.actorId);
        if (stack === undefined) {
          errors.push(`${street} action ${index + 1} actor stack is missing.`);
          return {
            street,
            actorId: row.actorId,
            action
          };
        }

        const committed = committedByActor.get(row.actorId) ?? 0;
        amount = Number(Math.max(stack - committed, 0).toFixed(4));
        if (amount <= 0) {
          errors.push(`${street} action ${index + 1} all-in has no remaining stack.`);
        }
      } else if (AMOUNT_REQUIRED_ACTIONS.has(action)) {
        amount = parsePositiveNumber(row.amount, `${street} action ${index + 1} amount`, errors);
      }

      if (typeof amount === "number" && amount > 0) {
        committedByActor.set(row.actorId, (committedByActor.get(row.actorId) ?? 0) + amount);
      }

      return {
        street,
        actorId: row.actorId,
        action,
        amount
      };
    })
    .filter((row): row is { street: "preflop" | "flop" | "turn" | "river"; actorId: string; action: PlayerAction; amount?: number } => Boolean(row));
}

export function buildManualInputDraft(params: BuildManualInputDraftParams): BuildResult {
  const errors: string[] = [];

  const potSize = parsePositiveNumber(params.potSize, "potSize", errors);
  const stacksByActor = new Map<string, number>();

  const players = params.players.map((player, index) => {
    if (!player.name.trim()) {
      errors.push(`Player ${index + 1} name is required.`);
    }
    const stack = parsePositiveNumber(player.stack, `Player ${index + 1} stack`, errors);
    const actorId = `p${index + 1}`;
    stacksByActor.set(actorId, stack);
    return {
      id: actorId,
      name: player.name.trim(),
      stack,
      position: player.position
    };
  });

  const holeCards: Record<string, [string, string]> = {};
  params.players.forEach((player, index) => {
    const [c1, c2] = player.holeCards;
    if (!c1 || !c2) {
      errors.push(`Player ${index + 1} must have two hole cards.`);
      return;
    }
    holeCards[`p${index + 1}`] = [c1, c2];
  });

  const committedByActor = new Map<string, number>();
  const actions = [
    ...serializeStreet("preflop", params.actionsByStreet.preflop, stacksByActor, committedByActor, errors),
    ...serializeStreet("flop", params.actionsByStreet.flop, stacksByActor, committedByActor, errors),
    ...serializeStreet("turn", params.actionsByStreet.turn, stacksByActor, committedByActor, errors),
    ...serializeStreet("river", params.actionsByStreet.river, stacksByActor, committedByActor, errors)
  ];

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    draft: {
      handId: params.handId,
      players,
      potSize,
      actions,
      board: {
        flop: params.board.flop.filter((card): card is string => Boolean(card)),
        turn: params.board.turn,
        river: params.board.river
      },
      holeCards
    }
  };
}

export type { ActionsByStreet };

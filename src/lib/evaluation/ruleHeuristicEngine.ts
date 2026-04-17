// abstract: Rule-based heuristic evaluator that maps action-pattern penalties to verdicts.
// out_of_scope: Solver-grade equilibrium computation and range-calculation engines.

import type { EvaluationResult, HandAction, HandScenario, InfoMode, PlayerSeat } from "../../types/poker";
import type { EvaluationEngine } from "./engine";
import { computeStrictShowdown } from "./winner";

interface TimelineState {
  activePlayers: Set<string>;
  streetContributed: Map<string, number>;
  totalCommitted: Map<string, number>;
  currentStreet: HandAction["street"] | null;
  highestStreetContribution: number;
  totalPot: number;
}

class RuleHeuristicEngine implements EvaluationEngine {
  evaluate(scenario: HandScenario, targetPlayerId: string, _mode: InfoMode): EvaluationResult {
    const target = scenario.players.find((player) => player.id === targetPlayerId);
    if (!target) {
      return {
        targetPlayerId,
        verdict: "questionable",
        severity: 2,
        summary: "Target player is not present in this hand.",
        rationale: ["Selected target player id is missing from scenario players."]
      };
    }

    const { score, rationale } = evaluateActionsInGlobalTimeline(scenario, target);
    const showdown = computeStrictShowdown(scenario);
    const showdownNote = buildShowdownNote(showdown, target.id, scenario.players);
    const verdict = score >= 4 ? "bad" : score >= 2 ? "questionable" : "good";
    const mergedRationale = [...(showdownNote ? [showdownNote] : []), ...rationale].slice(0, 4);

    return {
      targetPlayerId,
      verdict,
      severity: verdict === "bad" ? 3 : verdict === "questionable" ? 2 : 1,
      summary:
        verdict === "bad"
          ? "Global action line is highly overplayed versus pot and stack depth."
          : verdict === "questionable"
            ? "Global timeline shows leaks against pot-odds and pressure heuristics."
            : "Global line is consistent with baseline GTO heuristics.",
      rationale: mergedRationale.length > 0 ? mergedRationale : ["No major heuristic penalties were triggered."],
      alternativeLine: verdict === "good" ? undefined : "Prefer lower-variance sizing or a fold/call mix by pot odds."
    };
  }
}

function buildShowdownNote(
  showdown: ReturnType<typeof computeStrictShowdown>,
  targetPlayerId: string,
  players: PlayerSeat[]
): string | null {
  if (showdown.status === "no_contenders") {
    return "Strict winner check unavailable: no active players remain.";
  }
  if (showdown.status === "incomplete_cards") {
    return "Strict winner check skipped: full board and active-player hole cards are required.";
  }

  if (showdown.byFold) {
    if (showdown.winnerIds.includes(targetPlayerId)) {
      return "Strict winner check: target wins because all opponents folded.";
    }
    return "Strict winner check: target folded out before showdown.";
  }

  if (showdown.winnerIds.includes(targetPlayerId)) {
    if (showdown.winnerIds.length > 1) {
      return "Strict winner check: target ties for best hand at showdown.";
    }
    return "Strict winner check: target wins at showdown.";
  }

  const winnerNames = showdown.winnerIds
    .map((id) => players.find((player) => player.id === id)?.name ?? id)
    .join(", ");
  return `Strict winner check: target loses showdown (winner: ${winnerNames}).`;
}

function parseAmount(action: HandAction): number {
  const amount = action.amount ?? 0;
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function ensureStreet(state: TimelineState, street: HandAction["street"]) {
  if (state.currentStreet === street) {
    return;
  }
  state.currentStreet = street;
  state.streetContributed.clear();
  state.highestStreetContribution = 0;
}

function evaluateActionsInGlobalTimeline(scenario: HandScenario, target: PlayerSeat): { score: number; rationale: string[] } {
  let score = 0;
  const rationale: string[] = [];
  const state: TimelineState = {
    activePlayers: new Set(scenario.players.map((player) => player.id)),
    streetContributed: new Map(),
    totalCommitted: new Map(),
    currentStreet: null,
    highestStreetContribution: 0,
    totalPot: scenario.potSize
  };

  scenario.actions.forEach((action, index) => {
    ensureStreet(state, action.street);

    const currentContribution = state.streetContributed.get(action.actorId) ?? 0;
    const facingToCall = Math.max(state.highestStreetContribution - currentContribution, 0);
    const actionAmount = parseAmount(action);
    const potBefore = Math.max(state.totalPot, 1);

    if (action.actorId === target.id) {
      if (action.action === "call") {
        const callPressure = Math.max(facingToCall, actionAmount);
        if (callPressure / potBefore > 0.65) {
          score += 2;
          rationale.push(
            `Action ${index + 1} (${action.street}) call faces heavy pressure (${callPressure.toFixed(1)} into ${potBefore.toFixed(1)}).`
          );
        }
      }

      if (action.action === "bet" || action.action === "raise" || action.action === "all_in") {
        if (actionAmount > target.stack * 0.8) {
          score += 2;
          rationale.push(
            `Action ${index + 1} (${action.street}) aggression commits too much stack (${actionAmount.toFixed(1)}).`
          );
        }
        if (state.activePlayers.size >= 3 && actionAmount / potBefore > 0.8) {
          score += 2;
          rationale.push(
            `Action ${index + 1} (${action.street}) sizing is too large in a multiway pot (${actionAmount.toFixed(1)} into ${potBefore.toFixed(1)}).`
          );
        }
      }

      if (action.street !== "preflop" && target.position === "BB" && action.action === "raise") {
        score += 1;
        rationale.push("Out-of-position turn/river raising needs stronger range advantage.");
      }
    }

    if (action.action === "fold") {
      state.activePlayers.delete(action.actorId);
      return;
    }

    if (actionAmount <= 0) {
      return;
    }

    const nextStreetContribution = currentContribution + actionAmount;
    state.streetContributed.set(action.actorId, nextStreetContribution);
    state.totalCommitted.set(action.actorId, (state.totalCommitted.get(action.actorId) ?? 0) + actionAmount);
    state.totalPot += actionAmount;

    if (
      action.action === "bet" ||
      action.action === "raise" ||
      action.action === "all_in" ||
      nextStreetContribution > state.highestStreetContribution
    ) {
      state.highestStreetContribution = Math.max(state.highestStreetContribution, nextStreetContribution);
    }
  });

  return { score, rationale: [...new Set(rationale)].slice(0, 4) };
}

export function createRuleHeuristicEngine(): EvaluationEngine {
  return new RuleHeuristicEngine();
}

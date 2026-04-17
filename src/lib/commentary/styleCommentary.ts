// abstract: Transforms evaluation outcomes into constrained roommate-style comments and reasons.
// out_of_scope: Voice playback and strategic score calculation internals.

import { computeStrictShowdown } from "../evaluation/winner";
import type { CardCode, EvaluationResult, HandAction, HandScenario, PlayerSeat } from "../../types/poker";

export const APPROVED_LINES = [
  "鱼",
  "你干嘛啊",
  "纯在找爸爸",
  "你在讲什么鬼故事",
  "该你收池，打得有问题，不该call的",
  "太overplay了",
  "很极化",
  "没必要",
  "没必要没必要",
  "没毛病",
  "好fo好fo",
  "打得好",
  "好打好打",
  "打得没问题",
  "你咋把把有牌呀",
  "两个人都不知道在干什么",
  "两条鱼"
] as const;

export interface CommentaryPayload {
  roastLine: string;
  gtoReason: string;
}

interface WeightedLine {
  line: string;
  weight: number;
}

interface ActionSnapshot {
  action: HandAction;
  potBefore: number;
  facingToCall: number;
  activeCount: number;
}

const STREET_ORDER: HandAction["street"][] = ["preflop", "flop", "turn", "river"];
const EARLY_POSITION = new Set<PlayerSeat["position"]>(["SB", "BB", "UTG", "UTG+1"]);
const CATEGORY_VALUE: Record<string, number> = {
  high_card: 0,
  one_pair: 1,
  two_pair: 2,
  three_of_a_kind: 3,
  straight: 4,
  flush: 5,
  full_house: 6,
  four_of_a_kind: 7,
  straight_flush: 8
};
const RANK_VALUE: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14
};

function parseAmount(action: HandAction): number {
  const amount = Number(action.amount ?? 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value >= 1) {
    return 0.999999999999;
  }
  return value;
}

function pickWeightedLine(candidates: WeightedLine[], randomFn: () => number): string {
  const merged = new Map<string, number>();
  candidates.forEach((candidate) => {
    merged.set(candidate.line, (merged.get(candidate.line) ?? 0) + Math.max(candidate.weight, 0));
  });

  const normalized = [...merged.entries()]
    .filter(([, weight]) => weight > 0)
    .map(([line, weight]) => ({ line, weight }));

  const fallback = normalized[0]?.line ?? "你干嘛啊";
  if (normalized.length === 0) {
    return fallback;
  }

  const totalWeight = normalized.reduce((sum, item) => sum + item.weight, 0);
  let roll = clampProbability(randomFn()) * totalWeight;

  for (const item of normalized) {
    if (roll < item.weight) {
      return item.line;
    }
    roll -= item.weight;
  }

  return fallback;
}

function parseRank(card: CardCode | undefined): number {
  if (!card || card.length < 2) {
    return 0;
  }
  return RANK_VALUE[card[0]?.toUpperCase() ?? ""] ?? 0;
}

function isAtOrBetter(holeCards: [CardCode, CardCode] | undefined): boolean {
  if (!holeCards) {
    return false;
  }
  const rank1 = parseRank(holeCards[0]);
  const rank2 = parseRank(holeCards[1]);
  if (rank1 === 0 || rank2 === 0) {
    return false;
  }

  const hasAceWithBroadway = (rank1 === 14 && rank2 >= 10) || (rank2 === 14 && rank1 >= 10);
  const highPocketPair = rank1 === rank2 && rank1 >= 10;
  return hasAceWithBroadway || highPocketPair;
}

function buildActionSnapshots(scenario: HandScenario): ActionSnapshot[] {
  const snapshots: ActionSnapshot[] = [];
  let currentStreet: HandAction["street"] | null = null;
  let highestStreetContribution = 0;
  const activePlayers = new Set(scenario.players.map((player) => player.id));
  const streetContributions = new Map<string, number>();
  let totalPot = Math.max(scenario.potSize, 1);

  for (const action of scenario.actions) {
    if (currentStreet !== action.street) {
      currentStreet = action.street;
      highestStreetContribution = 0;
      streetContributions.clear();
    }

    const actorContribution = streetContributions.get(action.actorId) ?? 0;
    const facingToCall = Math.max(highestStreetContribution - actorContribution, 0);
    const amount = parseAmount(action);

    snapshots.push({
      action,
      potBefore: Math.max(totalPot, 1),
      facingToCall,
      activeCount: activePlayers.size
    });

    if (action.action === "fold") {
      activePlayers.delete(action.actorId);
      continue;
    }

    if (amount <= 0) {
      continue;
    }

    const nextContribution = actorContribution + amount;
    streetContributions.set(action.actorId, nextContribution);
    totalPot += amount;
    if (
      action.action === "bet" ||
      action.action === "raise" ||
      action.action === "all_in" ||
      nextContribution > highestStreetContribution
    ) {
      highestStreetContribution = Math.max(highestStreetContribution, nextContribution);
    }
  }

  return snapshots;
}

function add(candidates: WeightedLine[], line: string, weight: number) {
  candidates.push({ line, weight });
}

function buildRuleDrivenCandidates(
  result: EvaluationResult,
  scenario: HandScenario,
  targetPlayer: PlayerSeat
): WeightedLine[] {
  const candidates: WeightedLine[] = [];
  const showdown = computeStrictShowdown(scenario);
  const targetId = targetPlayer.id;
  const targetHoleCards = scenario.holeCards?.[targetId];
  const targetWins = showdown.status === "resolved" && showdown.winnerIds.includes(targetId);
  const targetLoses = showdown.status === "resolved" && !showdown.winnerIds.includes(targetId);
  const snapshots = buildActionSnapshots(scenario);
  const riverSnapshots = snapshots.filter((snapshot) => snapshot.action.street === "river");
  const targetSnapshots = snapshots.filter((snapshot) => snapshot.action.actorId === targetId);
  const targetRiverSnapshots = targetSnapshots.filter((snapshot) => snapshot.action.street === "river");
  const targetRiverAggressive = targetRiverSnapshots.filter(
    (snapshot) => snapshot.action.action === "bet" || snapshot.action.action === "raise"
  );

  if (isAtOrBetter(targetHoleCards as [CardCode, CardCode] | undefined) && targetWins) {
    add(candidates, "你咋把把有牌呀", 3);
  }

  if (targetLoses && targetRiverAggressive.length > 0) {
    add(candidates, "没必要没必要", 2.5);
    add(candidates, "纯在找爸爸", 2);
  }

  const targetRiverAggressiveIndices = new Set(
    targetRiverSnapshots
      .filter(
        (snapshot) =>
          snapshot.action.action === "bet" ||
          snapshot.action.action === "raise" ||
          snapshot.action.action === "all_in"
      )
      .map((snapshot) => snapshots.indexOf(snapshot))
  );
  const opponentFoldAfterTargetAggression = snapshots.some((snapshot, index) => {
    if (snapshot.action.street !== "river" || snapshot.action.action !== "fold" || snapshot.action.actorId === targetId) {
      return false;
    }
    for (let prev = index - 1; prev >= 0; prev -= 1) {
      if (snapshots[prev]?.action.street !== "river") {
        break;
      }
      if (targetRiverAggressiveIndices.has(prev)) {
        return true;
      }
    }
    return false;
  });

  const categoryByPlayer = new Map(
    (showdown.playerResults ?? []).map((entry) => [entry.playerId, CATEGORY_VALUE[entry.handCategory] ?? -1])
  );
  const targetCategory = categoryByPlayer.get(targetId) ?? -1;
  const successfulBluffLikeLine = targetWins && (opponentFoldAfterTargetAggression || targetCategory <= 1);
  if (successfulBluffLikeLine) {
    add(candidates, "打得好", 1.6);
    add(candidates, "打得没问题", 1.3);
    add(candidates, "好打好打", 1.3);
  }

  const riverTwoPlayers = riverSnapshots[0]?.activeCount === 2;
  const riverCallsUnderPressure = riverSnapshots.some(
    (snapshot) => snapshot.action.action === "call" && snapshot.facingToCall / snapshot.potBefore > 0.5
  );
  if (riverTwoPlayers && riverCallsUnderPressure && result.verdict !== "good") {
    add(candidates, "两个人都不知道在干什么", 2.2);
    add(candidates, "两条鱼", 1.8);
  }

  const targetFoldSnapshots = targetSnapshots.filter((snapshot) => snapshot.action.action === "fold");
  const foldUnderPressure = targetFoldSnapshots.some(
    (snapshot) => snapshot.facingToCall / snapshot.potBefore > 0.45
  );
  if (foldUnderPressure || (targetFoldSnapshots.length > 0 && EARLY_POSITION.has(targetPlayer.position))) {
    add(candidates, "好fo好fo", 2.4);
  }

  const targetRiverCalls = targetRiverSnapshots.filter((snapshot) => snapshot.action.action === "call");
  const bigRiverCall = targetRiverCalls.find((snapshot) => snapshot.facingToCall / snapshot.potBefore >= 0.75);
  if (targetWins && bigRiverCall) {
    const callIndex = snapshots.indexOf(bigRiverCall);
    const previous = callIndex > 0 ? snapshots[callIndex - 1] : undefined;
    const previousLooksLikeBluffStory =
      previous &&
      previous.action.street === "river" &&
      previous.action.actorId !== targetId &&
      (previous.action.action === "bet" || previous.action.action === "raise" || previous.action.action === "all_in");
    if (previousLooksLikeBluffStory) {
      add(candidates, "该你收池，打得有问题，不该call的", 3);
    }
  }

  const polarizedLine = targetSnapshots.some((snapshot) => {
    if (snapshot.action.action !== "bet" && snapshot.action.action !== "raise" && snapshot.action.action !== "all_in") {
      return false;
    }
    const amount = parseAmount(snapshot.action);
    return amount / snapshot.potBefore >= 1;
  });
  if (polarizedLine) {
    add(candidates, "很极化", 2);
    add(candidates, "太overplay了", 1.7);
  }

  const candidateCountBeforeFallback = candidates.length;
  if (result.verdict !== "good") {
    add(candidates, "你在干嘛啊", 1.2);
    add(candidates, "你在讲什么鬼故事", 1.2);
    add(candidates, "鱼", 1.1);
  } else {
    add(candidates, "没毛病", candidateCountBeforeFallback === 0 ? 3 : 1.2);
  }

  return candidates;
}

export function buildRoastLine(result: EvaluationResult, scenario?: HandScenario, randomFn: () => number = Math.random): string {
  if (!scenario) {
    if (result.verdict === "good") {
      return result.severity >= 2 ? "好fo好fo" : "打得没问题";
    }
    if (result.verdict === "bad") {
      return result.summary.toLowerCase().includes("call") ? "该你收池，打得有问题，不该call的" : "太overplay了";
    }
    return "你干嘛啊";
  }

  const targetPlayer = scenario.players.find((player) => player.id === result.targetPlayerId);
  if (!targetPlayer) {
    return "你在干嘛啊";
  }

  const ruleCandidates = buildRuleDrivenCandidates(result, scenario, targetPlayer);
  return pickWeightedLine(ruleCandidates, randomFn);
}

export function buildCommentary(
  result: EvaluationResult,
  scenario?: HandScenario,
  randomFn: () => number = Math.random
): CommentaryPayload {
  return {
    roastLine: buildRoastLine(result, scenario, randomFn),
    gtoReason: result.rationale.join(" ")
  };
}

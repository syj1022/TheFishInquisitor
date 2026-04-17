// abstract: Strict Texas Hold'em winner computation from actions, board, and hole cards.
// out_of_scope: Strategy critique scoring and UI presentation formatting.

import type { CardCode, HandAction, HandScenario, PlayerSeat } from "../../types/poker";

type Suit = "s" | "h" | "d" | "c";

interface ParsedCard {
  code: CardCode;
  rank: number;
  suit: Suit;
}

interface HandStrength {
  category: number;
  tiebreak: number[];
}

export interface StrictShowdownPlayerResult {
  playerId: string;
  handCategory: HandCategoryName;
}

export interface StrictShowdownResult {
  status: "resolved" | "incomplete_cards" | "no_contenders";
  byFold: boolean;
  winnerIds: string[];
  activePlayerIds: string[];
  playerResults?: StrictShowdownPlayerResult[];
  reason?: string;
}

type HandCategoryName =
  | "high_card"
  | "one_pair"
  | "two_pair"
  | "three_of_a_kind"
  | "straight"
  | "flush"
  | "full_house"
  | "four_of_a_kind"
  | "straight_flush";

const RANK_TO_VALUE: Record<string, number> = {
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

const CATEGORY_NAME: Record<number, HandCategoryName> = {
  0: "high_card",
  1: "one_pair",
  2: "two_pair",
  3: "three_of_a_kind",
  4: "straight",
  5: "flush",
  6: "full_house",
  7: "four_of_a_kind",
  8: "straight_flush"
};

function parseCard(code: string): ParsedCard | null {
  const normalized = code.trim();
  if (normalized.length !== 2) {
    return null;
  }
  const rankChar = normalized[0]?.toUpperCase();
  const suitChar = normalized[1]?.toLowerCase();
  if (!rankChar || !suitChar) {
    return null;
  }

  const rank = RANK_TO_VALUE[rankChar];
  if (!rank) {
    return null;
  }
  if (suitChar !== "s" && suitChar !== "h" && suitChar !== "d" && suitChar !== "c") {
    return null;
  }

  return { code: normalized as CardCode, rank, suit: suitChar };
}

function getActivePlayerIds(players: PlayerSeat[], actions: HandAction[]): string[] {
  const active = new Set(players.map((player) => player.id));
  for (const action of actions) {
    if (action.action === "fold") {
      active.delete(action.actorId);
    }
  }
  return players.map((player) => player.id).filter((id) => active.has(id));
}

function toCounts(cards: ParsedCard[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const card of cards) {
    counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  }
  return counts;
}

function getStraightHigh(cards: ParsedCard[]): number | null {
  const unique = new Set(cards.map((card) => card.rank));
  for (let high = 14; high >= 5; high -= 1) {
    if (
      unique.has(high) &&
      unique.has(high - 1) &&
      unique.has(high - 2) &&
      unique.has(high - 3) &&
      unique.has(high - 4)
    ) {
      return high;
    }
  }
  if (unique.has(14) && unique.has(5) && unique.has(4) && unique.has(3) && unique.has(2)) {
    return 5;
  }
  return null;
}

function sortDesc(values: number[]): number[] {
  return [...values].sort((a, b) => b - a);
}

function evaluateFiveCards(cards: ParsedCard[]): HandStrength {
  const counts = toCounts(cards);
  const entries = [...counts.entries()].sort((left, right) => {
    if (left[1] !== right[1]) {
      return right[1] - left[1];
    }
    return right[0] - left[0];
  });
  const ranksDesc = sortDesc(cards.map((card) => card.rank));
  const isFlush = cards.every((card) => card.suit === cards[0]?.suit);
  const straightHigh = getStraightHigh(cards);

  if (isFlush && straightHigh) {
    return { category: 8, tiebreak: [straightHigh] };
  }

  if (entries[0]?.[1] === 4) {
    const fourRank = entries[0][0];
    const kicker = entries[1]?.[0] ?? 0;
    return { category: 7, tiebreak: [fourRank, kicker] };
  }

  if (entries[0]?.[1] === 3 && entries[1]?.[1] === 2) {
    return { category: 6, tiebreak: [entries[0][0], entries[1][0]] };
  }

  if (isFlush) {
    return { category: 5, tiebreak: ranksDesc };
  }

  if (straightHigh) {
    return { category: 4, tiebreak: [straightHigh] };
  }

  if (entries[0]?.[1] === 3) {
    const trip = entries[0][0];
    const kickers = entries.slice(1).map(([rank]) => rank);
    return { category: 3, tiebreak: [trip, ...sortDesc(kickers)] };
  }

  if (entries[0]?.[1] === 2 && entries[1]?.[1] === 2) {
    const topPair = Math.max(entries[0][0], entries[1][0]);
    const lowPair = Math.min(entries[0][0], entries[1][0]);
    const kicker = entries[2]?.[0] ?? 0;
    return { category: 2, tiebreak: [topPair, lowPair, kicker] };
  }

  if (entries[0]?.[1] === 2) {
    const pair = entries[0][0];
    const kickers = sortDesc(entries.slice(1).map(([rank]) => rank));
    return { category: 1, tiebreak: [pair, ...kickers] };
  }

  return { category: 0, tiebreak: ranksDesc };
}

function compareStrength(left: HandStrength, right: HandStrength): number {
  if (left.category !== right.category) {
    return left.category - right.category;
  }
  const maxLength = Math.max(left.tiebreak.length, right.tiebreak.length);
  for (let index = 0; index < maxLength; index += 1) {
    const delta = (left.tiebreak[index] ?? 0) - (right.tiebreak[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return 0;
}

function evaluateSevenCards(cards: ParsedCard[]): HandStrength {
  let best: HandStrength | null = null;
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            const candidate = evaluateFiveCards([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || compareStrength(candidate, best) > 0) {
              best = candidate;
            }
          }
        }
      }
    }
  }
  if (!best) {
    return { category: 0, tiebreak: [] };
  }
  return best;
}

function hasDuplicateCards(cards: ParsedCard[]): boolean {
  const seen = new Set(cards.map((card) => card.code));
  return seen.size !== cards.length;
}

export function computeStrictShowdown(scenario: HandScenario): StrictShowdownResult {
  const activePlayerIds = getActivePlayerIds(scenario.players, scenario.actions);
  if (activePlayerIds.length === 0) {
    return {
      status: "no_contenders",
      byFold: false,
      winnerIds: [],
      activePlayerIds,
      reason: "No active players remain after fold actions."
    };
  }

  if (activePlayerIds.length === 1) {
    return {
      status: "resolved",
      byFold: true,
      winnerIds: activePlayerIds,
      activePlayerIds,
      playerResults: [
        {
          playerId: activePlayerIds[0],
          handCategory: "high_card"
        }
      ]
    };
  }

  const flop = scenario.board?.flop ?? [];
  const turn = scenario.board?.turn;
  const river = scenario.board?.river;
  if (flop.length !== 3 || !turn || !river) {
    return {
      status: "incomplete_cards",
      byFold: false,
      winnerIds: [],
      activePlayerIds,
      reason: "Showdown requires flop, turn, and river cards."
    };
  }

  const parsedBoard = [flop[0], flop[1], flop[2], turn, river].map((card) => parseCard(card ?? ""));
  if (parsedBoard.some((card) => !card)) {
    return {
      status: "incomplete_cards",
      byFold: false,
      winnerIds: [],
      activePlayerIds,
      reason: "Board contains invalid card code."
    };
  }
  const boardCards = parsedBoard as ParsedCard[];

  const holeCardsByPlayer = scenario.holeCards ?? {};
  const evaluated = activePlayerIds.map((playerId) => {
    const pair = holeCardsByPlayer[playerId];
    if (!pair) {
      return { playerId, strength: null as HandStrength | null, error: "Missing hole cards for active player." };
    }
    const parsedPair = [parseCard(pair[0]), parseCard(pair[1])];
    if (!parsedPair[0] || !parsedPair[1]) {
      return { playerId, strength: null as HandStrength | null, error: "Invalid hole card code for active player." };
    }
    const sevenCards = [...boardCards, parsedPair[0], parsedPair[1]];
    if (hasDuplicateCards(sevenCards)) {
      return { playerId, strength: null as HandStrength | null, error: "Duplicate cards detected in showdown set." };
    }
    return { playerId, strength: evaluateSevenCards(sevenCards), error: null };
  });

  const firstError = evaluated.find((entry) => entry.error)?.error;
  if (firstError) {
    return {
      status: "incomplete_cards",
      byFold: false,
      winnerIds: [],
      activePlayerIds,
      reason: firstError
    };
  }

  const strengths = evaluated as Array<{ playerId: string; strength: HandStrength }>;
  const best = strengths.reduce((current, next) =>
    compareStrength(next.strength, current.strength) > 0 ? next : current
  );

  const winnerIds = strengths
    .filter((entry) => compareStrength(entry.strength, best.strength) === 0)
    .map((entry) => entry.playerId);

  return {
    status: "resolved",
    byFold: false,
    winnerIds,
    activePlayerIds,
    playerResults: strengths.map((entry) => ({
      playerId: entry.playerId,
      handCategory: CATEGORY_NAME[entry.strength.category] ?? "high_card"
    }))
  };
}

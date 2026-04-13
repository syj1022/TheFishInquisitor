// abstract: Utilities for deck generation, card uniqueness, and seat-position mappings.
// out_of_scope: UI component rendering and parser serialization behavior.

export type CardCode = `${string}${string}`;

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;
const SUITS = ["s", "h", "d", "c"] as const;

const POSITIONS_BY_SEAT_COUNT: Record<number, string[]> = {
  2: ["BTN", "BB"],
  3: ["BTN", "SB", "BB"],
  4: ["CO", "BTN", "SB", "BB"],
  5: ["HJ", "CO", "BTN", "SB", "BB"],
  6: ["UTG", "HJ", "CO", "BTN", "SB", "BB"],
  7: ["UTG", "MP", "HJ", "CO", "BTN", "SB", "BB"],
  8: ["UTG", "UTG+1", "MP", "HJ", "CO", "BTN", "SB", "BB"],
  9: ["UTG", "UTG+1", "MP1", "MP2", "HJ", "CO", "BTN", "SB", "BB"]
};

export function buildDeck(): CardCode[] {
  return RANKS.flatMap((rank) => SUITS.map((suit) => `${rank}${suit}` as CardCode));
}

export function getPositionsForSeatCount(seatCount: number): string[] {
  const positions = POSITIONS_BY_SEAT_COUNT[seatCount];
  if (!positions) {
    throw new Error(`Unsupported seat count: ${seatCount}`);
  }
  return positions;
}

export function hasDuplicateCards(cards: readonly string[]): boolean {
  const filtered = cards.filter((card) => card.trim().length > 0);
  return new Set(filtered).size !== filtered.length;
}

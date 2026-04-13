// abstract: Unit tests for deck generation and seat-position mapping helpers.
// out_of_scope: UI rendering and form-state orchestration behaviors.

import { buildDeck, getPositionsForSeatCount, hasDuplicateCards } from "../../src/lib/manual/cardUtils";

test("buildDeck returns 52 unique cards", () => {
  const deck = buildDeck();
  expect(deck).toHaveLength(52);
  expect(new Set(deck).size).toBe(52);
  expect(deck).toContain("As");
  expect(deck).toContain("2c");
});

test("maps seat count to supported position list", () => {
  expect(getPositionsForSeatCount(2)).toEqual(["BTN", "BB"]);
  expect(getPositionsForSeatCount(6)).toEqual(["UTG", "HJ", "CO", "BTN", "SB", "BB"]);
  expect(getPositionsForSeatCount(9)).toEqual(["UTG", "UTG+1", "MP1", "MP2", "HJ", "CO", "BTN", "SB", "BB"]);
});

test("detects duplicate cards in mixed inputs", () => {
  expect(hasDuplicateCards(["As", "Kd", "7c"])).toBe(false);
  expect(hasDuplicateCards(["As", "Kd", "As"])).toBe(true);
});

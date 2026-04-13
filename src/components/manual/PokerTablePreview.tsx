// abstract: Interactive poker-table editor for seats, cards, and street action timelines.
// out_of_scope: Strategy evaluation, commentary generation, and voice playback orchestration.

import { useMemo, useState } from "react";
import { getPositionsForSeatCount } from "../../lib/manual/cardUtils";
import type { PlayerAction, Street, TablePosition } from "../../types/poker";
import CardGridPicker from "./CardGridPicker";
import type { BoardDraft } from "./BoardCardPicker";
import type { PlayerDraft } from "./PlayerSetupPanel";
import type { ActionChoice, ActionDraft, ActionsByStreet } from "./StreetActionsEditor";

interface PokerTablePreviewProps {
  seatCount: number;
  players: PlayerDraft[];
  board: BoardDraft;
  actionsByStreet: ActionsByStreet;
  occupiedCards: string[];
  onSeatCountChange: (seatCount: number) => void;
  onPlayerChange: (index: number, next: PlayerDraft) => void;
  onHoleCardChange: (index: number, cardIndex: 0 | 1, card: string | undefined) => void;
  onBoardChange: (next: BoardDraft) => void;
  onActionsChange: (next: ActionsByStreet) => void;
}

type BoardSlot = "flop-0" | "flop-1" | "flop-2" | "turn" | "river";
type ActiveCardSlot =
  | { type: "hole"; playerIndex: number; cardIndex: 0 | 1 }
  | { type: "board"; slot: BoardSlot }
  | null;

const STREET_KEYS: Street[] = ["preflop", "flop", "turn", "river"];
const ACTION_OPTIONS: ActionChoice[] = ["none", "fold", "check", "call", "bet", "raise", "all_in"];
const MANUAL_AMOUNT_ACTIONS = new Set<PlayerAction>(["call", "bet", "raise"]);
const ACTION_ORDER_PRE_FLOP: TablePosition[] = [
  "UTG",
  "UTG+1",
  "MP",
  "MP1",
  "MP2",
  "HJ",
  "CO",
  "BTN",
  "SB",
  "BB"
];
const ACTION_ORDER_POST_FLOP: TablePosition[] = [
  "SB",
  "BB",
  "UTG",
  "UTG+1",
  "MP",
  "MP1",
  "MP2",
  "HJ",
  "CO",
  "BTN"
];
const HU_ORDER: TablePosition[] = ["BB", "BTN"];

const SUIT_SYMBOLS: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣"
};

function toStreetLabel(street: Street): string {
  return street.charAt(0).toUpperCase() + street.slice(1);
}

function parseCard(card: string | undefined): { rank: string; suit: string } | null {
  if (!card || card.length < 2) {
    return null;
  }
  const rank = card.slice(0, -1).toUpperCase();
  const suit = card.slice(-1).toLowerCase();
  if (!SUIT_SYMBOLS[suit]) {
    return null;
  }
  return { rank, suit };
}

function parsePositiveNumber(raw: string): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatNumber(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "0";
  }
  return amount.toFixed(2).replace(/\.?0+$/, "");
}

function getSeatLayout(playerCount: number): { xRadius: number; yRadius: number; seatWidth: number; compact: boolean } {
  if (playerCount >= 9) {
    return { xRadius: 46, yRadius: 38, seatWidth: 140, compact: true };
  }
  if (playerCount === 8) {
    return { xRadius: 45, yRadius: 37, seatWidth: 146, compact: true };
  }
  if (playerCount === 7) {
    return { xRadius: 44, yRadius: 36, seatWidth: 152, compact: true };
  }
  if (playerCount === 6) {
    return { xRadius: 43, yRadius: 35, seatWidth: 158, compact: false };
  }
  return { xRadius: 41, yRadius: 33, seatWidth: 168, compact: false };
}

function getOrderedPlayerIds(players: PlayerDraft[], street: Street): string[] {
  const isHeadsUp =
    players.length === 2 &&
    players.some((player) => player.position === "BTN") &&
    players.some((player) => player.position === "BB");

  const positionOrder = isHeadsUp ? HU_ORDER : street === "preflop" ? ACTION_ORDER_PRE_FLOP : ACTION_ORDER_POST_FLOP;
  const rankByPosition = new Map(positionOrder.map((position, index) => [position, index]));

  return players
    .map((player, index) => ({
      id: `p${index + 1}`,
      rank: rankByPosition.get(player.position) ?? 999
    }))
    .sort((left, right) => left.rank - right.rank)
    .map((entry) => entry.id);
}

function getNextActorId(players: PlayerDraft[], street: Street, streetRows: ActionDraft[]): string {
  const orderedIds = getOrderedPlayerIds(players, street);
  if (orderedIds.length === 0) {
    return "p1";
  }
  if (streetRows.length === 0) {
    return orderedIds[0];
  }

  const activePlayers = new Set(orderedIds);
  for (const row of streetRows) {
    if (row.action === "fold") {
      activePlayers.delete(row.actorId);
    }
  }

  const inHandOrder = orderedIds.filter((id) => activePlayers.has(id));
  if (inHandOrder.length === 0) {
    return orderedIds[0];
  }

  const lastActorId = streetRows[streetRows.length - 1]?.actorId;
  const lastIndex = inHandOrder.indexOf(lastActorId);
  if (lastIndex < 0) {
    return inHandOrder[0];
  }
  return inHandOrder[(lastIndex + 1) % inHandOrder.length];
}

function canAppendAction(players: PlayerDraft[], street: Street, streetRows: ActionDraft[]): boolean {
  const orderedIds = getOrderedPlayerIds(players, street);
  const activePlayers = new Set(orderedIds);
  for (const row of streetRows) {
    if (row.action === "fold") {
      activePlayers.delete(row.actorId);
    }
  }
  return activePlayers.size > 1;
}

function accumulateAmount(row: ActionDraft, stacksByActor: Map<string, number>, committedByActor: Map<string, number>) {
  if (row.action === "none" || row.action === "fold" || row.action === "check") {
    return;
  }

  if (row.action === "all_in") {
    const stack = stacksByActor.get(row.actorId) ?? 0;
    const committed = committedByActor.get(row.actorId) ?? 0;
    const remaining = Math.max(stack - committed, 0);
    committedByActor.set(row.actorId, committed + remaining);
    return;
  }

  const amount = parsePositiveNumber(row.amount);
  if (amount <= 0) {
    return;
  }
  committedByActor.set(row.actorId, (committedByActor.get(row.actorId) ?? 0) + amount);
}

function computeAllInAmountForRow(
  players: PlayerDraft[],
  actionsByStreet: ActionsByStreet,
  street: Street,
  rowIndex: number
): number {
  const stacksByActor = new Map(players.map((player, index) => [`p${index + 1}`, parsePositiveNumber(player.stack)]));
  const committedByActor = new Map<string, number>();
  const currentStreetRows = actionsByStreet[street];
  const actorId = currentStreetRows[rowIndex]?.actorId;

  if (!actorId) {
    return 0;
  }

  for (const streetKey of STREET_KEYS) {
    const rows = actionsByStreet[streetKey];
    rows.forEach((row, index) => {
      if (streetKey === street && index >= rowIndex) {
        return;
      }
      accumulateAmount(row, stacksByActor, committedByActor);
    });
    if (streetKey === street) {
      break;
    }
  }

  const stack = stacksByActor.get(actorId) ?? 0;
  const committed = committedByActor.get(actorId) ?? 0;
  return Math.max(stack - committed, 0);
}

function CardFaceButton({
  card,
  onClick
}: {
  card: string | undefined;
  onClick: () => void;
}) {
  const parsed = parseCard(card);
  if (!parsed) {
    return (
      <button type="button" className="card-face card-face-empty" onClick={onClick}>
        --
      </button>
    );
  }

  const isRed = parsed.suit === "h" || parsed.suit === "d";

  return (
    <button
      type="button"
      className={`card-face ${isRed ? "card-face-red" : "card-face-black"}`}
      onClick={onClick}
    >
      <span>{parsed.rank}</span>
      <span>{SUIT_SYMBOLS[parsed.suit]}</span>
    </button>
  );
}

export default function PokerTablePreview({
  seatCount,
  players,
  board,
  actionsByStreet,
  occupiedCards,
  onSeatCountChange,
  onPlayerChange,
  onHoleCardChange,
  onBoardChange,
  onActionsChange
}: PokerTablePreviewProps) {
  const [activeStreet, setActiveStreet] = useState<Street>("preflop");
  const [activeCardSlot, setActiveCardSlot] = useState<ActiveCardSlot>(null);

  const positionOptions = useMemo(() => getPositionsForSeatCount(seatCount), [seatCount]);
  const orderedActorIds = useMemo(() => getOrderedPlayerIds(players, activeStreet), [players, activeStreet]);
  const activeStreetRows = actionsByStreet[activeStreet];
  const seatLayout = useMemo(() => getSeatLayout(players.length), [players.length]);

  const activeSlotCard = useMemo(() => {
    if (!activeCardSlot) {
      return undefined;
    }

    if (activeCardSlot.type === "hole") {
      return players[activeCardSlot.playerIndex]?.holeCards[activeCardSlot.cardIndex];
    }

    if (activeCardSlot.slot.startsWith("flop")) {
      const index = Number(activeCardSlot.slot.split("-")[1]);
      return board.flop[index];
    }

    if (activeCardSlot.slot === "turn") {
      return board.turn;
    }

    return board.river;
  }, [activeCardSlot, players, board]);

  const updateStreetAction = (rowIndex: number, patch: Partial<ActionDraft>) => {
    const nextRows = [...activeStreetRows];
    const base = nextRows[rowIndex] ?? { actorId: getNextActorId(players, activeStreet, activeStreetRows), action: "none", amount: "" };
    const nextRow = { ...base, ...patch };
    if (patch.action && (patch.action === "none" || patch.action === "fold" || patch.action === "check" || patch.action === "all_in")) {
      nextRow.amount = "";
    }
    nextRows[rowIndex] = nextRow;
    onActionsChange({ ...actionsByStreet, [activeStreet]: nextRows });
  };

  const removeStreetAction = (rowIndex: number) => {
    const nextRows = activeStreetRows.filter((_, index) => index !== rowIndex);
    onActionsChange({ ...actionsByStreet, [activeStreet]: nextRows });
  };

  const addStreetAction = () => {
    const actorId = getNextActorId(players, activeStreet, activeStreetRows);
    const nextRows = [...activeStreetRows, { actorId, action: "none", amount: "" }];
    onActionsChange({ ...actionsByStreet, [activeStreet]: nextRows });
  };

  const pickCard = (card: string) => {
    if (!activeCardSlot) {
      return;
    }

    if (activeCardSlot.type === "hole") {
      onHoleCardChange(activeCardSlot.playerIndex, activeCardSlot.cardIndex, card);
      setActiveCardSlot(null);
      return;
    }

    if (activeCardSlot.slot.startsWith("flop")) {
      const index = Number(activeCardSlot.slot.split("-")[1]);
      const nextFlop: BoardDraft["flop"] = [...board.flop] as BoardDraft["flop"];
      nextFlop[index] = card;
      onBoardChange({ ...board, flop: nextFlop });
      setActiveCardSlot(null);
      return;
    }

    if (activeCardSlot.slot === "turn") {
      onBoardChange({ ...board, turn: card });
      setActiveCardSlot(null);
      return;
    }

    onBoardChange({ ...board, river: card });
    setActiveCardSlot(null);
  };

  const clearCard = () => {
    if (!activeCardSlot) {
      return;
    }

    if (activeCardSlot.type === "hole") {
      onHoleCardChange(activeCardSlot.playerIndex, activeCardSlot.cardIndex, undefined);
      setActiveCardSlot(null);
      return;
    }

    if (activeCardSlot.slot.startsWith("flop")) {
      const index = Number(activeCardSlot.slot.split("-")[1]);
      const nextFlop: BoardDraft["flop"] = [...board.flop] as BoardDraft["flop"];
      nextFlop[index] = undefined;
      onBoardChange({ ...board, flop: nextFlop });
      setActiveCardSlot(null);
      return;
    }

    if (activeCardSlot.slot === "turn") {
      onBoardChange({ ...board, turn: undefined });
      setActiveCardSlot(null);
      return;
    }

    onBoardChange({ ...board, river: undefined });
    setActiveCardSlot(null);
  };

  return (
    <section aria-label="poker-table-preview">
      <h3>Table Preview</h3>

      <div className="table-config-row">
        <label htmlFor="seat-count">Number of players</label>
        <select id="seat-count" value={seatCount} onChange={(event) => onSeatCountChange(Number(event.target.value))}>
          {Array.from({ length: 8 }, (_, idx) => idx + 2).map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </div>

      <div className="street-tabs" role="tablist" aria-label="Street selector">
        {STREET_KEYS.map((street) => (
          <button
            key={street}
            type="button"
            role="tab"
            aria-selected={activeStreet === street}
            className={activeStreet === street ? "street-tab active" : "street-tab"}
            onClick={() => setActiveStreet(street)}
          >
            {toStreetLabel(street)}
          </button>
        ))}
      </div>

      <div className="poker-table">
        <div className="board-row">
          <CardFaceButton card={board.flop[0]} onClick={() => setActiveCardSlot({ type: "board", slot: "flop-0" })} />
          <CardFaceButton card={board.flop[1]} onClick={() => setActiveCardSlot({ type: "board", slot: "flop-1" })} />
          <CardFaceButton card={board.flop[2]} onClick={() => setActiveCardSlot({ type: "board", slot: "flop-2" })} />
          <CardFaceButton card={board.turn} onClick={() => setActiveCardSlot({ type: "board", slot: "turn" })} />
          <CardFaceButton card={board.river} onClick={() => setActiveCardSlot({ type: "board", slot: "river" })} />
        </div>

        {players.map((player, index) => {
          const angle = ((2 * Math.PI) / players.length) * index - Math.PI / 2;
          const left = 50 + Math.cos(angle) * seatLayout.xRadius;
          const top = 50 + Math.sin(angle) * seatLayout.yRadius;
          const className = seatLayout.compact ? "table-seat table-seat-editable table-seat-compact" : "table-seat table-seat-editable";

          return (
            <div
              key={index}
              className={className}
              style={{ left: `${left}%`, top: `${top}%`, width: `${seatLayout.seatWidth}px` }}
            >
              <input
                aria-label={`Player name ${index + 1}`}
                className="seat-input"
                value={player.name}
                onChange={(event) => onPlayerChange(index, { ...player, name: event.target.value })}
              />

              <div className="seat-meta-grid">
                <select
                  aria-label={`Player position ${index + 1}`}
                  value={player.position}
                  onChange={(event) =>
                    onPlayerChange(index, {
                      ...player,
                      position: event.target.value as PlayerDraft["position"]
                    })
                  }
                >
                  {positionOptions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>

                <input
                  aria-label={`Player stack ${index + 1}`}
                  className="seat-input"
                  value={player.stack}
                  onChange={(event) => onPlayerChange(index, { ...player, stack: event.target.value })}
                />
              </div>

              <div className="seat-cards">
                <CardFaceButton
                  card={player.holeCards[0]}
                  onClick={() => setActiveCardSlot({ type: "hole", playerIndex: index, cardIndex: 0 })}
                />
                <CardFaceButton
                  card={player.holeCards[1]}
                  onClick={() => setActiveCardSlot({ type: "hole", playerIndex: index, cardIndex: 1 })}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="table-street-actions">
        <div className="table-street-actions-header">
          <h4>{`${toStreetLabel(activeStreet)} Actions`}</h4>
          <button
            type="button"
            className="secondary-button add-action-button"
            onClick={addStreetAction}
            disabled={!canAppendAction(players, activeStreet, activeStreetRows)}
          >
            Add Action
          </button>
        </div>

        {activeStreetRows.length === 0 ? <p className="street-action-empty">No actions yet. Click Add Action.</p> : null}

        {activeStreetRows.map((row, index) => {
          const allInAmount =
            row.action === "all_in"
              ? computeAllInAmountForRow(players, actionsByStreet, activeStreet, index)
              : 0;

          return (
            <div key={`${activeStreet}-${index}`} className="street-action-row">
              <span className="street-action-index">{index + 1}</span>

              <select
                aria-label={`Actor ${activeStreet} ${index + 1}`}
                value={row.actorId}
                onChange={(event) => updateStreetAction(index, { actorId: event.target.value })}
              >
                {orderedActorIds.map((actorId) => {
                  const actorIndex = Number(actorId.slice(1)) - 1;
                  const actorName = players[actorIndex]?.name || `Player ${actorIndex + 1}`;
                  return (
                    <option key={`${activeStreet}-${index}-${actorId}`} value={actorId}>
                      {actorName}
                    </option>
                  );
                })}
              </select>

              <select
                aria-label={`Action ${activeStreet} ${index + 1}`}
                value={row.action}
                onChange={(event) => updateStreetAction(index, { action: event.target.value as ActionChoice })}
              >
                {ACTION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              {MANUAL_AMOUNT_ACTIONS.has(row.action as PlayerAction) ? (
                <input
                  aria-label={`Amount ${activeStreet} ${index + 1}`}
                  value={row.amount}
                  onChange={(event) => updateStreetAction(index, { amount: event.target.value })}
                />
              ) : null}

              {row.action === "all_in" ? (
                <p className="auto-amount-label">{`All-in auto: ${formatNumber(allInAmount)}`}</p>
              ) : null}

              <button
                type="button"
                className="secondary-button remove-action-button"
                aria-label={`Remove action ${activeStreet} ${index + 1}`}
                onClick={() => removeStreetAction(index)}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      {activeCardSlot ? (
        <div className="manual-picker-wrap">
          <CardGridPicker
            occupiedCards={occupiedCards}
            selectedCard={activeSlotCard}
            onSelect={pickCard}
            onClear={clearCard}
          />
        </div>
      ) : null}
    </section>
  );
}

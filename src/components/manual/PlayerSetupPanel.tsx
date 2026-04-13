// abstract: Player-setup form for seat count, names, positions, stacks, and hole-card slots.
// out_of_scope: Card-grid popup state orchestration and board/action timeline editing.

import { useState } from "react";
import { getPositionsForSeatCount } from "../../lib/manual/cardUtils";
import type { TablePosition } from "../../types/poker";
import CardGridPicker from "./CardGridPicker";

export interface PlayerDraft {
  name: string;
  position: TablePosition;
  stack: string;
  holeCards: [string | undefined, string | undefined];
}

interface PlayerSetupPanelProps {
  seatCount: number;
  players: PlayerDraft[];
  occupiedCards: string[];
  onSeatCountChange: (seatCount: number) => void;
  onPlayerChange: (index: number, next: PlayerDraft) => void;
  onHoleCardChange: (index: number, cardIndex: 0 | 1, card: string | undefined) => void;
}

export default function PlayerSetupPanel({
  seatCount,
  players,
  occupiedCards,
  onSeatCountChange,
  onPlayerChange,
  onHoleCardChange
}: PlayerSetupPanelProps) {
  const positionOptions = getPositionsForSeatCount(seatCount);
  const [activeHoleSlot, setActiveHoleSlot] = useState<{ playerIndex: number; cardIndex: 0 | 1 } | null>(
    null
  );

  const selectedCard = activeHoleSlot
    ? players[activeHoleSlot.playerIndex]?.holeCards[activeHoleSlot.cardIndex]
    : undefined;

  const handlePick = (card: string) => {
    if (!activeHoleSlot) {
      return;
    }
    onHoleCardChange(activeHoleSlot.playerIndex, activeHoleSlot.cardIndex, card);
    setActiveHoleSlot(null);
  };

  const handleClear = () => {
    if (!activeHoleSlot) {
      return;
    }
    onHoleCardChange(activeHoleSlot.playerIndex, activeHoleSlot.cardIndex, undefined);
    setActiveHoleSlot(null);
  };

  return (
    <section aria-label="player-setup-panel">
      <h3>Players</h3>
      <label htmlFor="seat-count">Number of players</label>
      <select
        id="seat-count"
        value={seatCount}
        onChange={(event) => onSeatCountChange(Number(event.target.value))}
      >
        {Array.from({ length: 8 }, (_, idx) => idx + 2).map((count) => (
          <option key={count} value={count}>
            {count}
          </option>
        ))}
      </select>

      {players.map((player, index) => (
        <fieldset key={index} className="manual-fieldset">
          <legend>{`Player ${index + 1}`}</legend>
          <label htmlFor={`player-name-${index}`}>Name</label>
          <input
            id={`player-name-${index}`}
            value={player.name}
            onChange={(event) => onPlayerChange(index, { ...player, name: event.target.value })}
          />

          <label htmlFor={`player-position-${index}`}>Position</label>
          <select
            id={`player-position-${index}`}
            value={player.position}
            onChange={(event) =>
              onPlayerChange(index, { ...player, position: event.target.value as TablePosition })
            }
          >
            {positionOptions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>

          <label htmlFor={`player-stack-${index}`}>Stack</label>
          <input
            id={`player-stack-${index}`}
            value={player.stack}
            onChange={(event) => onPlayerChange(index, { ...player, stack: event.target.value })}
          />

          <div className="hole-card-row">
            <button type="button" onClick={() => setActiveHoleSlot({ playerIndex: index, cardIndex: 0 })}>
              {`Hole Card 1: ${player.holeCards[0] ?? "Select"}`}
            </button>
            <button type="button" onClick={() => setActiveHoleSlot({ playerIndex: index, cardIndex: 1 })}>
              {`Hole Card 2: ${player.holeCards[1] ?? "Select"}`}
            </button>
          </div>
        </fieldset>
      ))}

      {activeHoleSlot ? (
        <div className="manual-picker-wrap">
          <p className="picker-caption">
            {`Select card for Player ${activeHoleSlot.playerIndex + 1} - Hole ${activeHoleSlot.cardIndex + 1}`}
          </p>
          <CardGridPicker
            occupiedCards={occupiedCards}
            selectedCard={selectedCard}
            onSelect={handlePick}
            onClear={handleClear}
          />
        </div>
      ) : null}
    </section>
  );
}

// abstract: Board-card selector for flop/turn/river slots using the shared card-grid picker.
// out_of_scope: Player-seat configuration and action sequencing logic.

import { useState } from "react";
import CardGridPicker from "./CardGridPicker";

type BoardSlotKey = "flop-0" | "flop-1" | "flop-2" | "turn" | "river";

export interface BoardDraft {
  flop: [string | undefined, string | undefined, string | undefined];
  turn: string | undefined;
  river: string | undefined;
}

interface BoardCardPickerProps {
  board: BoardDraft;
  occupiedCards: string[];
  onBoardChange: (next: BoardDraft) => void;
}

export default function BoardCardPicker({ board, occupiedCards, onBoardChange }: BoardCardPickerProps) {
  const [activeSlot, setActiveSlot] = useState<BoardSlotKey | null>(null);

  const getActiveCard = () => {
    if (!activeSlot) {
      return undefined;
    }
    if (activeSlot.startsWith("flop")) {
      const idx = Number(activeSlot.split("-")[1]);
      return board.flop[idx];
    }
    if (activeSlot === "turn") {
      return board.turn;
    }
    return board.river;
  };

  const handlePick = (card: string) => {
    if (!activeSlot) {
      return;
    }
    if (activeSlot.startsWith("flop")) {
      const idx = Number(activeSlot.split("-")[1]);
      const nextFlop: BoardDraft["flop"] = [...board.flop] as BoardDraft["flop"];
      nextFlop[idx] = card;
      onBoardChange({ ...board, flop: nextFlop });
    } else if (activeSlot === "turn") {
      onBoardChange({ ...board, turn: card });
    } else {
      onBoardChange({ ...board, river: card });
    }
    setActiveSlot(null);
  };

  const clearActiveSlot = () => {
    if (!activeSlot) {
      return;
    }
    if (activeSlot.startsWith("flop")) {
      const idx = Number(activeSlot.split("-")[1]);
      const nextFlop: BoardDraft["flop"] = [...board.flop] as BoardDraft["flop"];
      nextFlop[idx] = undefined;
      onBoardChange({ ...board, flop: nextFlop });
    } else if (activeSlot === "turn") {
      onBoardChange({ ...board, turn: undefined });
    } else {
      onBoardChange({ ...board, river: undefined });
    }
    setActiveSlot(null);
  };

  return (
    <section aria-label="board-card-picker">
      <h3>Board Cards</h3>
      <button type="button" onClick={() => setActiveSlot("flop-0")}>
        {`Flop 1: ${board.flop[0] ?? "Select"}`}
      </button>
      <button type="button" onClick={() => setActiveSlot("flop-1")}>
        {`Flop 2: ${board.flop[1] ?? "Select"}`}
      </button>
      <button type="button" onClick={() => setActiveSlot("flop-2")}>
        {`Flop 3: ${board.flop[2] ?? "Select"}`}
      </button>
      <button type="button" onClick={() => setActiveSlot("turn")}>
        {`Turn: ${board.turn ?? "Select"}`}
      </button>
      <button type="button" onClick={() => setActiveSlot("river")}>
        {`River: ${board.river ?? "Select"}`}
      </button>

      {activeSlot ? (
        <div className="manual-picker-wrap">
          <p className="picker-caption">{`Select ${activeSlot.replace("-", " ").toUpperCase()}`}</p>
          <CardGridPicker
            occupiedCards={occupiedCards}
            selectedCard={getActiveCard()}
            onSelect={handlePick}
            onClear={clearActiveSlot}
          />
        </div>
      ) : null}
    </section>
  );
}

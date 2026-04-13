// abstract: Reusable 52-card button grid with occupied-card disable semantics.
// out_of_scope: Street-slot orchestration and hand-level validation policy.

import { buildDeck } from "../../lib/manual/cardUtils";

interface CardGridPickerProps {
  occupiedCards?: string[];
  selectedCard?: string;
  onSelect: (card: string) => void;
  onClear?: () => void;
}

export default function CardGridPicker({
  occupiedCards = [],
  selectedCard,
  onSelect,
  onClear
}: CardGridPickerProps) {
  const deck = buildDeck();
  const occupied = new Set(occupiedCards);

  return (
    <section aria-label="card-grid-picker" className="card-grid-picker">
      {onClear ? (
        <button type="button" className="secondary-button" onClick={onClear}>
          Clear Card
        </button>
      ) : null}
      <div className="card-grid">
        {deck.map((card) => {
          const isSelected = card === selectedCard;
          const isDisabled = occupied.has(card) && !isSelected;
          return (
            <button
              key={card}
              type="button"
              className="card-cell"
              aria-pressed={isSelected}
              disabled={isDisabled}
              onClick={() => onSelect(card)}
            >
              {card}
            </button>
          );
        })}
      </div>
    </section>
  );
}

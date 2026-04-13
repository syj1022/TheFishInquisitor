// abstract: Controls for selecting target player and information-set mode before critique.
// out_of_scope: Evaluation calculations and commentary rendering details.

import type { InfoMode, PlayerSeat } from "../types/poker";

interface ReviewControlPanelProps {
  players: PlayerSeat[];
  selectedPlayerId: string;
  onPlayerChange: (playerId: string) => void;
  mode: InfoMode;
  onModeChange: (mode: InfoMode) => void;
  onCritique: () => void;
}

export default function ReviewControlPanel({
  players,
  selectedPlayerId,
  onPlayerChange,
  mode,
  onModeChange,
  onCritique
}: ReviewControlPanelProps) {
  return (
    <section aria-label="review-control-panel">
      <h2>Review Controls</h2>
      <label htmlFor="target-player">Target player</label>
      <select id="target-player" value={selectedPlayerId} onChange={(event) => onPlayerChange(event.target.value)}>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}
          </option>
        ))}
      </select>

      <label htmlFor="mode-select">Info mode</label>
      <select id="mode-select" value={mode} onChange={(event) => onModeChange(event.target.value as InfoMode)}>
        <option value="revealed_cards">Revealed cards</option>
        <option value="incomplete_info">Incomplete info</option>
      </select>

      <button type="button" onClick={onCritique}>
        Critique
      </button>
    </section>
  );
}

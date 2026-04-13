// abstract: Per-street action row editor for actor/action/amount draft state.
// out_of_scope: Parser normalization and player/board selection controls.

import type { PlayerAction } from "../../types/poker";

export type ActionChoice = PlayerAction | "none";

export interface ActionDraft {
  actorId: string;
  action: ActionChoice;
  amount: string;
}

export interface ActionsByStreet {
  preflop: ActionDraft[];
  flop: ActionDraft[];
  turn: ActionDraft[];
  river: ActionDraft[];
}

interface StreetActionsEditorProps {
  players: { id: string; name: string }[];
  actionsByStreet: ActionsByStreet;
  onActionsChange: (next: ActionsByStreet) => void;
}

const STREET_KEYS: Array<keyof ActionsByStreet> = ["preflop", "flop", "turn", "river"];
const ACTION_OPTIONS: ActionChoice[] = ["none", "fold", "check", "call", "bet", "raise", "all_in"];
const AMOUNT_REQUIRED_ACTIONS = new Set<PlayerAction>(["call", "bet", "raise", "all_in"]);

function toLabel(street: keyof ActionsByStreet): string {
  return street.charAt(0).toUpperCase() + street.slice(1);
}

export default function StreetActionsEditor({
  players,
  actionsByStreet,
  onActionsChange
}: StreetActionsEditorProps) {
  const updateAction = (street: keyof ActionsByStreet, index: number, patch: Partial<ActionDraft>) => {
    const rows = [...actionsByStreet[street]];
    const nextRow = { ...rows[index], ...patch };
    if (patch.action && (patch.action === "none" || !AMOUNT_REQUIRED_ACTIONS.has(patch.action))) {
      nextRow.amount = "";
    }
    rows[index] = nextRow;
    onActionsChange({ ...actionsByStreet, [street]: rows });
  };

  return (
    <section aria-label="street-actions-editor">
      <h3>Actions</h3>
      {STREET_KEYS.map((street) => (
        <div key={street}>
          <h4>{toLabel(street)}</h4>
          {actionsByStreet[street].map((row, index) => (
            <div key={`${street}-${index}`} className="action-row">
              <p className="action-player-name">
                {players.find((player) => player.id === row.actorId)?.name ?? row.actorId}
              </p>

              <label htmlFor={`${street}-action-${index}`}>{`Action ${street} ${index + 1}`}</label>
              <select
                id={`${street}-action-${index}`}
                value={row.action}
                onChange={(event) => updateAction(street, index, { action: event.target.value as ActionChoice })}
              >
                {ACTION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              {AMOUNT_REQUIRED_ACTIONS.has(row.action) ? (
                <>
                  <label htmlFor={`${street}-amount-${index}`}>{`Amount ${street} ${index + 1}`}</label>
                  <input
                    id={`${street}-amount-${index}`}
                    value={row.amount}
                    onChange={(event) => updateAction(street, index, { amount: event.target.value })}
                  />
                </>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

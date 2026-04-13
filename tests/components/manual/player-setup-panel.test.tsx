// abstract: Component contracts for configurable seat and player-field editing UI.
// out_of_scope: Downstream parser serialization and evaluator integration behavior.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlayerSetupPanel, { type PlayerDraft } from "../../../src/components/manual/PlayerSetupPanel";

test("changes seat count and exposes valid position options", async () => {
  const user = userEvent.setup();
  const onSeatCountChange = vi.fn();
  const onPlayerChange = vi.fn();
  const players: PlayerDraft[] = [
    { name: "Hero", position: "BTN", stack: "100", holeCards: ["As", "Kd"] },
    { name: "Villain", position: "BB", stack: "100", holeCards: ["7c", "7d"] }
  ];

  render(
    <PlayerSetupPanel
      seatCount={2}
      players={players}
      occupiedCards={["As", "Kd", "7c", "7d"]}
      onSeatCountChange={onSeatCountChange}
      onPlayerChange={onPlayerChange}
      onHoleCardChange={vi.fn()}
    />
  );

  await user.selectOptions(screen.getByLabelText("Number of players"), "3");
  expect(onSeatCountChange).toHaveBeenCalledWith(3);
  expect(screen.getAllByRole("option", { name: "BTN" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("option", { name: "BB" }).length).toBeGreaterThan(0);
});

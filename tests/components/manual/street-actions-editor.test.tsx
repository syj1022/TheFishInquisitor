// abstract: Component contracts for fixed per-street action editing per player seat.
// out_of_scope: Final parser normalization and board/player draft handling.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StreetActionsEditor, { type ActionsByStreet } from "../../../src/components/manual/StreetActionsEditor";

test("renders fixed player rows per street and toggles amount field by action", async () => {
  const user = userEvent.setup();
  const onActionsChange = vi.fn();
  const initial: ActionsByStreet = {
    preflop: [
      { actorId: "p1", action: "check", amount: "" },
      { actorId: "p2", action: "check", amount: "" }
    ],
    flop: [
      { actorId: "p1", action: "none" as never, amount: "" },
      { actorId: "p2", action: "none" as never, amount: "" }
    ],
    turn: [
      { actorId: "p1", action: "none" as never, amount: "" },
      { actorId: "p2", action: "none" as never, amount: "" }
    ],
    river: [
      { actorId: "p1", action: "none" as never, amount: "" },
      { actorId: "p2", action: "none" as never, amount: "" }
    ]
  };

  render(
    <StreetActionsEditor
      players={[
        { id: "p1", name: "Hero" },
        { id: "p2", name: "Villain" }
      ]}
      actionsByStreet={initial}
      onActionsChange={onActionsChange}
    />
  );

  expect(screen.queryByRole("button", { name: "Add Preflop Action" })).not.toBeInTheDocument();
  expect(screen.getAllByText("Hero").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Villain").length).toBeGreaterThan(0);

  await user.selectOptions(screen.getByLabelText("Action preflop 1"), "raise");
  const latest = onActionsChange.mock.calls.at(-1)?.[0] as ActionsByStreet;
  expect(latest.preflop[0].action).toBe("raise");
});

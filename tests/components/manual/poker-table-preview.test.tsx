// abstract: Component tests for table-preview action sequencing and all-in amount display.
// out_of_scope: Manual parser normalization and evaluator integration.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import PokerTablePreview from "../../../src/components/manual/PokerTablePreview";
import type { ActionsByStreet } from "../../../src/components/manual/StreetActionsEditor";

function PokerTableHarness({
  heroStack = "100",
  villainStack = "100"
}: {
  heroStack?: string;
  villainStack?: string;
}) {
  const [actionsByStreet, setActionsByStreet] = useState<ActionsByStreet>({
    preflop: [],
    flop: [],
    turn: [],
    river: []
  });

  return (
    <PokerTablePreview
      seatCount={2}
      players={[
        { name: "杰哥", position: "BTN", stack: heroStack, holeCards: ["As", "Kd"] },
        { name: "小白", position: "BB", stack: villainStack, holeCards: ["7c", "7d"] }
      ]}
      board={{ flop: [undefined, undefined, undefined], turn: undefined, river: undefined }}
      actionsByStreet={actionsByStreet}
      occupiedCards={[]}
      onSeatCountChange={() => undefined}
      onPlayerChange={() => undefined}
      onHoleCardChange={() => undefined}
      onBoardChange={() => undefined}
      onActionsChange={setActionsByStreet}
    />
  );
}

test("adds preflop actions in heads-up order BB -> BTN -> BB", async () => {
  const user = userEvent.setup();
  render(<PokerTableHarness />);

  await user.click(screen.getByRole("button", { name: "Add Action" }));
  expect((screen.getByLabelText("Actor preflop 1") as HTMLSelectElement).value).toBe("p2");

  await user.selectOptions(screen.getByLabelText("Action preflop 1"), "raise");
  await user.click(screen.getByRole("button", { name: "Add Action" }));
  expect((screen.getByLabelText("Actor preflop 2") as HTMLSelectElement).value).toBe("p1");

  await user.selectOptions(screen.getByLabelText("Action preflop 2"), "raise");
  await user.click(screen.getByRole("button", { name: "Add Action" }));
  expect((screen.getByLabelText("Actor preflop 3") as HTMLSelectElement).value).toBe("p2");
});

test("shows auto all-in amount and hides amount input", async () => {
  const user = userEvent.setup();
  render(<PokerTableHarness />);

  await user.click(screen.getByRole("button", { name: "Add Action" }));
  await user.selectOptions(screen.getByLabelText("Action preflop 1"), "all_in");

  expect(screen.queryByLabelText("Amount preflop 1")).not.toBeInTheDocument();
  expect(screen.getByText("All-in auto: 100")).toBeInTheDocument();
});

test("auto-fills call to highest bet and caps by remaining stack", async () => {
  const user = userEvent.setup();
  render(<PokerTableHarness heroStack="40" villainStack="100" />);

  await user.click(screen.getByRole("button", { name: "Add Action" }));
  await user.selectOptions(screen.getByLabelText("Action preflop 1"), "raise");
  await user.type(screen.getByLabelText("Amount preflop 1"), "60");

  await user.click(screen.getByRole("button", { name: "Add Action" }));
  await user.selectOptions(screen.getByLabelText("Action preflop 2"), "call");

  expect((screen.getByLabelText("Amount preflop 2") as HTMLInputElement).value).toBe("40");
});

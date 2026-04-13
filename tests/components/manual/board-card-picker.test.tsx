// abstract: Component contracts for street board-slot selection and change notifications.
// out_of_scope: Player-hole-card management and action timeline logic.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BoardCardPicker from "../../../src/components/manual/BoardCardPicker";

test("selects flop card through picker and emits board update", async () => {
  const user = userEvent.setup();
  const onBoardChange = vi.fn();

  render(
    <BoardCardPicker
      board={{ flop: [undefined, undefined, undefined], turn: undefined, river: undefined }}
      occupiedCards={["As"]}
      onBoardChange={onBoardChange}
    />
  );

  await user.click(screen.getByRole("button", { name: "Flop 1: Select" }));
  await user.click(screen.getByRole("button", { name: "Kd" }));

  expect(onBoardChange).toHaveBeenCalled();
  const latest = onBoardChange.mock.calls.at(-1)?.[0];
  expect(latest.flop[0]).toBe("Kd");
});

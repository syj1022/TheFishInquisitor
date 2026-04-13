// abstract: Component contracts for card-grid selection and occupied-card disabling.
// out_of_scope: Board-slot state coordination logic.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CardGridPicker from "../../../src/components/manual/CardGridPicker";

test("disables occupied cards and emits selected card", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();

  render(<CardGridPicker occupiedCards={["As"]} onSelect={onSelect} />);

  expect(screen.getByRole("button", { name: "As" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Kd" }));
  expect(onSelect).toHaveBeenCalledWith("Kd");
});

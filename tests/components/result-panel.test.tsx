// abstract: Component tests for result rendering, rationale toggle, and auto-play behavior.
// out_of_scope: Upstream parser/evaluation computations and API integration.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResultPanel from "../../src/components/ResultPanel";

test("shows commentary and reveals technical reason on demand", async () => {
  const user = userEvent.setup();
  const autoPlay = vi.fn();

  render(
    <ResultPanel
      commentary={{ roastLine: "太overplay了", gtoReason: "Turn call over-consumes equity threshold." }}
      autoPlay={autoPlay}
    />
  );

  expect(screen.getByText("太overplay了")).toBeInTheDocument();
  expect(screen.queryByText("Turn call over-consumes equity threshold.")).not.toBeInTheDocument();
  expect(autoPlay).toHaveBeenCalledWith("太overplay了");

  await user.click(screen.getByRole("button", { name: "View GTO reason" }));
  expect(screen.getByText("Turn call over-consumes equity threshold.")).toBeInTheDocument();
});

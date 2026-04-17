// abstract: Smoke test for the end-to-end manual-hand-to-commentary-and-voice flow.
// out_of_scope: Parser schema edge cases and solver adapter behavior.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import App from "../../src/App";

test("manual hand review produces short line, expandable reason, and voice trigger", async () => {
  const user = userEvent.setup();
  const play = vi.fn().mockResolvedValue(undefined);
  const pause = vi.fn();

  vi.stubGlobal(
    "Audio",
    class {
      src: string;
      currentTime = 0;
      onended: (() => void) | null = null;

      constructor(src: string) {
        this.src = src;
      }

      play = play;
      pause = pause;
    }
  );

  render(React.createElement(App));

  expect(screen.queryByLabelText("Voice output mode")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Cloud voice")).not.toBeInTheDocument();

  expect(screen.getByLabelText("Number of players")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Submit Manual Hand" }));
  await user.click(screen.getByRole("button", { name: "Critique" }));

  expect(screen.queryByText("打得没问题")).not.toBeInTheDocument();
  expect(play).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole("button", { name: "View GTO reason" }));
  expect(screen.getByText("No major heuristic penalties were triggered.")).toBeInTheDocument();
});

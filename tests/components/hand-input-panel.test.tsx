// abstract: Component tests for structured manual-builder rendering and submit behavior.
// out_of_scope: End-to-end evaluator, commentary, and voice playback integration.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HandInputPanel from "../../src/components/HandInputPanel";

test("renders manual builder controls, table preview, and submits a scenario", async () => {
  const user = userEvent.setup();
  const onScenarioReady = vi.fn();
  const onCritiqueRequested = vi.fn(async () => null);
  const onReplayVoice = vi.fn();

  render(
    <HandInputPanel
      onScenarioReady={onScenarioReady}
      onCritiqueRequested={onCritiqueRequested}
      commentary={null}
      statusMessage={null}
      onReplayVoice={onReplayVoice}
    />
  );
  expect(screen.getByRole("heading", { name: "听世强锐评" })).toBeInTheDocument();
  expect(screen.getByLabelText("Number of players")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Table Preview" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "A ♠" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Critique" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Submit Manual Hand" }));
  expect(onScenarioReady).toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Submit Manual Hand" })).toBeInTheDocument();
});

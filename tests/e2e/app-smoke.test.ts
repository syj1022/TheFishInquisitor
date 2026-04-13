// abstract: Smoke test for the end-to-end manual-hand-to-commentary-and-voice flow.
// out_of_scope: Parser schema edge cases and solver adapter behavior.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import App from "../../src/App";

class MockUtterance {
  text: string;
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

test("manual hand review produces short line, expandable reason, and voice trigger", async () => {
  const user = userEvent.setup();
  const speak = vi.fn();
  const cancel = vi.fn();
  const maleVoice = { name: "Yunxi Male", lang: "zh-CN" } as SpeechSynthesisVoice;

  vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      getVoices: () => [maleVoice],
      cancel,
      speak
    }
  });

  render(React.createElement(App));

  expect(screen.getByLabelText("Voice output mode")).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Voice output mode"), "cloud_male_cn");
  expect(screen.getByLabelText("Cloud voice")).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Voice output mode"), "browser_male_cn");

  expect(screen.getByLabelText("Number of players")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Submit Manual Hand" }));
  await user.click(screen.getByRole("button", { name: "Critique" }));

  expect(screen.queryByText("打得没问题")).not.toBeInTheDocument();
  expect(speak).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole("button", { name: "View GTO reason" }));
  expect(screen.getByText("No major heuristic penalties were triggered.")).toBeInTheDocument();
});

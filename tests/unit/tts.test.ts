// abstract: Unit tests for browser TTS playback guardrails and playback calls.
// out_of_scope: UI-level critique wiring and commentary generation behavior.

import { playCritiqueVoice } from "../../src/lib/voice/tts";

test("resumes paused synthesis before speaking", () => {
  const speak = vi.fn();
  const cancel = vi.fn();
  const resume = vi.fn();
  const maleVoice = { name: "Yunxi Male", lang: "zh-CN" } as SpeechSynthesisVoice;

  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string;
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;

      constructor(text: string) {
        this.text = text;
      }
    }
  );

  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      paused: true,
      getVoices: () => [maleVoice],
      cancel,
      resume,
      speak
    }
  });

  const result = playCritiqueVoice("打得没问题");
  expect(result.ok).toBe(true);
  expect(resume).toHaveBeenCalledTimes(1);
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(speak).toHaveBeenCalledTimes(1);
});

test("fails when no supported male voice exists", () => {
  const speak = vi.fn();
  const cancel = vi.fn();
  const resume = vi.fn();
  const femaleVoice = { name: "Xiaoxiao", lang: "zh-CN" } as SpeechSynthesisVoice;

  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      text: string;
      rate = 1;
      pitch = 1;
      voice: SpeechSynthesisVoice | null = null;

      constructor(text: string) {
        this.text = text;
      }
    }
  );

  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: {
      paused: false,
      getVoices: () => [femaleVoice],
      cancel,
      resume,
      speak
    }
  });

  const result = playCritiqueVoice("打得没问题");
  expect(result.ok).toBe(false);
  expect(speak).not.toHaveBeenCalled();
});

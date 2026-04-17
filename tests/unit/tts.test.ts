// abstract: Unit tests for voicepack clip selection and playback.
// out_of_scope: Evaluator and commentary generation rules.

import { chooseVoicepackClip, playVoicepackLine } from "../../src/lib/voice/voicepack";

test("selects uniformly from all variants for a scenario", () => {
  const first = chooseVoicepackClip("好fo好fo", () => 0);
  const last = chooseVoicepackClip("好fo好fo", () => 0.999999);

  expect(first).toBeTruthy();
  expect(last).toBeTruthy();
  expect(first).not.toEqual(last);
});

test("plays one selected voicepack clip", async () => {
  const play = vi.fn().mockResolvedValue(undefined);
  const pause = vi.fn();

  vi.stubGlobal(
    "Audio",
    class {
      src: string;
      currentTime = 0;

      constructor(src: string) {
        this.src = src;
      }

      play = play;
      pause = pause;
    }
  );

  const result = await playVoicepackLine("打得没问题", () => 0);
  expect(result.ok).toBe(true);
  expect(play).toHaveBeenCalledTimes(1);
});

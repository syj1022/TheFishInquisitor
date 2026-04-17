// abstract: Unit tests for voicepack clip selection and playback.
// out_of_scope: Evaluator and commentary generation rules.

import { chooseVoicepackClip, playVoicepackLine } from "../../src/lib/voice/voicepack";

test("selects uniformly from all variants for a scenario", () => {
  let rolls = 0;
  const random = () => {
    rolls += 1;
    return rolls === 1 ? 0.2 : 0;
  };
  const first = chooseVoicepackClip("好fo好fo", random);
  const last = chooseVoicepackClip("好fo好fo", () => 0.999999);

  expect(first).toBeTruthy();
  expect(last).toBeTruthy();
  expect(first).not.toEqual(last);
});

test("can trigger global laugh variants on any line", () => {
  const random = vi.fn()
    .mockReturnValueOnce(0)
    .mockReturnValueOnce(0.999999);
  const clip = chooseVoicepackClip("打得没问题", random);
  expect(clip).toBeTruthy();
  expect(random).toHaveBeenCalledTimes(2);
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

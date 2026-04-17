// abstract: Voicepack-based critique playback with scenario-to-clips mapping.
// out_of_scope: SpeechSynthesis/browser voice discovery and cloud TTS provider integration.

import type { VoiceResult } from "./tts";

type RandomFn = () => number;

const CLIP_URL = {
  badCall: new URL("../../../voicepack/该你收池，打得有问题，不该call的.MP3", import.meta.url).href,
  noIssueAlt: new URL("../../../voicepack/没毛病.MP3", import.meta.url).href,
  whatAreYouDoing: new URL("../../../voicepack/你在干嘛啊.MP3", import.meta.url).href,
  ghostStory: new URL("../../../voicepack/你在讲什么鬼故事.MP3", import.meta.url).href,
  goodFo: new URL("../../../voicepack/好fo好fo.MP3", import.meta.url).href,
  cluelessBoth: new URL("../../../voicepack/两个人都不知道在干什么.MP3", import.meta.url).href,
  laugh1: new URL("../../../voicepack/魔性大笑1.MP3", import.meta.url).href,
  overplay: new URL("../../../voicepack/太overplay了.MP3", import.meta.url).href,
  laugh2: new URL("../../../voicepack/魔性大笑2.MP3", import.meta.url).href,
  laugh3: new URL("../../../voicepack/魔性大笑3.MP3", import.meta.url).href,
  findDaddy: new URL("../../../voicepack/纯在找爸爸.MP3", import.meta.url).href,
  fish: new URL("../../../voicepack/鱼.MP3", import.meta.url).href,
  laugh7: new URL("../../../voicepack/魔性大笑7.MP3", import.meta.url).href,
  doubleFish: new URL("../../../voicepack/两条鱼.MP3", import.meta.url).href,
  laugh6: new URL("../../../voicepack/魔性大笑6.MP3", import.meta.url).href,
  laugh4: new URL("../../../voicepack/魔性大笑4.MP3", import.meta.url).href,
  laugh5: new URL("../../../voicepack/魔性大笑5.MP3", import.meta.url).href,
  goodPlay: new URL("../../../voicepack/好打好打.MP3", import.meta.url).href,
  alwaysHasCards: new URL("../../../voicepack/你咋把把有牌呀.MP3", import.meta.url).href,
  unnecessary: new URL("../../../voicepack/没必要没必要.MP3", import.meta.url).href,
  polarized: new URL("../../../voicepack/很极化.MP3", import.meta.url).href,
  playedWell: new URL("../../../voicepack/打得好.MP3", import.meta.url).href,
  noIssue: new URL("../../../voicepack/打得没问题.MP3", import.meta.url).href
} as const;

const SCENARIO_VARIANTS: Readonly<Record<string, readonly string[]>> = {
  鱼: [CLIP_URL.fish, CLIP_URL.doubleFish, CLIP_URL.laugh1, CLIP_URL.laugh2, CLIP_URL.laugh3, CLIP_URL.laugh4],
  "你干嘛啊": [CLIP_URL.whatAreYouDoing, CLIP_URL.cluelessBoth, CLIP_URL.alwaysHasCards, CLIP_URL.laugh5],
  纯在找爸爸: [CLIP_URL.findDaddy, CLIP_URL.doubleFish, CLIP_URL.fish, CLIP_URL.laugh6],
  "你在讲什么鬼故事": [CLIP_URL.ghostStory, CLIP_URL.cluelessBoth, CLIP_URL.laugh7],
  "该你收池，打得有问题，不该call的": [CLIP_URL.badCall, CLIP_URL.overplay, CLIP_URL.polarized],
  太overplay了: [CLIP_URL.overplay, CLIP_URL.polarized, CLIP_URL.alwaysHasCards],
  没必要: [CLIP_URL.unnecessary, CLIP_URL.polarized],
  好fo好fo: [CLIP_URL.goodFo, CLIP_URL.goodPlay, CLIP_URL.playedWell, CLIP_URL.noIssueAlt],
  好打好打: [CLIP_URL.goodPlay, CLIP_URL.playedWell, CLIP_URL.noIssueAlt],
  打得没问题: [CLIP_URL.noIssue, CLIP_URL.playedWell, CLIP_URL.noIssueAlt, CLIP_URL.goodPlay]
};

let activeAudio: HTMLAudioElement | null = null;

function clampProbability(probability: number): number {
  if (!Number.isFinite(probability)) {
    return 0;
  }
  if (probability < 0) {
    return 0;
  }
  if (probability >= 1) {
    return 0.999999999999;
  }
  return probability;
}

function variantsForLine(line: string): readonly string[] {
  const directMatch = SCENARIO_VARIANTS[line];
  if (directMatch) {
    return directMatch;
  }

  const normalized = line.trim();
  if (!normalized) {
    return [];
  }

  const fuzzyKey = Object.keys(SCENARIO_VARIANTS).find(
    (candidate) => normalized.includes(candidate) || candidate.includes(normalized)
  );
  return fuzzyKey ? SCENARIO_VARIANTS[fuzzyKey] : [];
}

export function chooseVoicepackClip(line: string, randomFn: RandomFn = Math.random): string | null {
  const variants = variantsForLine(line);
  if (variants.length === 0) {
    return null;
  }
  const probability = clampProbability(randomFn());
  const index = Math.floor(probability * variants.length);
  return variants[index] ?? variants[0];
}

export async function playVoicepackLine(line: string, randomFn: RandomFn = Math.random): Promise<VoiceResult> {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return { ok: false, error: "Voicepack playback is unavailable in this environment." };
  }
  if (!line.trim()) {
    return { ok: false, error: "Cannot speak an empty commentary line." };
  }

  const clip = chooseVoicepackClip(line, randomFn);
  if (!clip) {
    return { ok: false, error: "No matching voicepack clip for this commentary line." };
  }

  try {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }

    const audio = new Audio(clip);
    activeAudio = audio;
    audio.onended = () => {
      if (activeAudio === audio) {
        activeAudio = null;
      }
    };
    await audio.play();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message || "Voicepack playback failed." };
  }
}

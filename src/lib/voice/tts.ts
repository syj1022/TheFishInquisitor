// abstract: Browser TTS helpers for male-voice selection, listing, and playback.
// out_of_scope: Commentary generation and evaluation-engine orchestration.

export interface VoiceResult {
  ok: boolean;
  error?: string;
}

export interface VoiceOption {
  name: string;
  lang: string;
  isChinese: boolean;
  hasMaleHint: boolean;
  hasFemaleHint: boolean;
}

const MALE_HINTS = [
  "male",
  "man",
  "nan",
  "yunxi",
  "yunjian",
  "yunhao",
  "yunyang",
  "xiaogang",
  "kangkang",
  "gang",
  "jian",
  "eddy",
  "reed",
  "rocko",
  "grandpa",
  "george",
  "alex",
  "daniel"
];
const FEMALE_HINTS = [
  "female",
  "woman",
  "nv",
  "xiaoxiao",
  "xiaoyi",
  "tingting",
  "meijia",
  "samantha",
  "victoria",
  "karen",
  "serena",
  "ava"
];

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasAnyHint(name: string, hints: readonly string[]): boolean {
  return hints.some((hint) => name.includes(hint));
}

function isChineseLang(lang: string): boolean {
  return lang.toLowerCase().startsWith("zh");
}

function mapToVoiceOption(voice: SpeechSynthesisVoice): VoiceOption {
  const normalizedName = normalizeName(voice.name);
  return {
    name: voice.name,
    lang: voice.lang,
    isChinese: isChineseLang(voice.lang),
    hasMaleHint: hasAnyHint(normalizedName, MALE_HINTS),
    hasFemaleHint: hasAnyHint(normalizedName, FEMALE_HINTS)
  };
}

function toVoiceMap(voices: SpeechSynthesisVoice[]): Map<string, SpeechSynthesisVoice> {
  return new Map(voices.map((voice) => [voice.name, voice]));
}

export function listVoiceOptions(): VoiceOption[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices().map(mapToVoiceOption);
}

export function suggestMaleChineseVoiceName(options: VoiceOption[]): string | null {
  const candidates = options.filter((option) => option.isChinese && option.hasMaleHint && !option.hasFemaleHint);
  if (candidates.length === 0) {
    return null;
  }
  return candidates[0].name;
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  preferredVoiceName?: string
): SpeechSynthesisVoice | undefined {
  const voiceOptions = voices.map(mapToVoiceOption);
  const voiceMap = toVoiceMap(voices);

  if (preferredVoiceName) {
    const selectedOption = voiceOptions.find((option) => option.name === preferredVoiceName);
    if (!selectedOption || !selectedOption.isChinese || !selectedOption.hasMaleHint || selectedOption.hasFemaleHint) {
      return undefined;
    }
    return voiceMap.get(preferredVoiceName);
  }

  const chineseMale = voiceOptions.find((option) => option.isChinese && option.hasMaleHint && !option.hasFemaleHint);
  if (chineseMale) {
    return voiceMap.get(chineseMale.name);
  }
  return undefined;
}

export function playCritiqueVoice(text: string, preferredVoiceName?: string): VoiceResult {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return { ok: false, error: "Speech synthesis is unavailable in this environment." };
  }
  if (!text.trim()) {
    return { ok: false, error: "Cannot speak an empty commentary line." };
  }

  try {
    const synthesis = window.speechSynthesis;
    const voices = synthesis.getVoices();
    if (voices.length === 0) {
      return { ok: false, error: "Voice list not ready. Click Refresh Voices, then replay." };
    }

    const voice = pickVoice(voices, preferredVoiceName);
    if (!voice) {
      return {
        ok: false,
        error: preferredVoiceName
          ? "Selected voice is unavailable now. Please refresh voices and re-select."
          : "No supported Chinese male-like voice found in this browser. Please refresh voices and select manually."
      };
    }

    if ("paused" in synthesis && synthesis.paused) {
      synthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang || "zh-CN";
    utterance.rate = 1;
    utterance.pitch = 1;

    synthesis.cancel();
    synthesis.speak(utterance);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message || "Voice playback failed." };
  }
}

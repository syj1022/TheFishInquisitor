// abstract: Cloud-based fixed male Mandarin TTS playback for stable cross-browser output.
// out_of_scope: Strategy commentary generation and system speech-synthesis voice discovery.

import type { VoiceResult } from "./tts";

interface CloudTtsConfig {
  apiKey: string;
  model?: string;
  voice?: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini-tts";
export const DEFAULT_CLOUD_TTS_VOICE = "ash";
export const CLOUD_TTS_VOICE_OPTIONS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "ash", label: "Ash (male, recommended)" },
  { id: "onyx", label: "Onyx (male, deep)" },
  { id: "echo", label: "Echo (male, clear)" },
  { id: "alloy", label: "Alloy (neutral)" },
  { id: "sage", label: "Sage (neutral)" },
  { id: "verse", label: "Verse (neutral)" }
];

export async function playCloudMaleChineseVoice(text: string, config: CloudTtsConfig): Promise<VoiceResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Cloud voice playback is unavailable in this environment." };
  }

  if (!text.trim()) {
    return { ok: false, error: "Cannot speak an empty commentary line." };
  }

  if (!config.apiKey.trim()) {
    return { ok: false, error: "OpenAI API key is required for cloud voice playback." };
  }

  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const model = config.model ?? DEFAULT_MODEL;
  const voice = config.voice ?? DEFAULT_CLOUD_TTS_VOICE;

  try {
    const response = await fetch(`${baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        format: "mp3",
        instructions: "Speak naturally in Mandarin Chinese with a steady male voice."
      })
    });

    if (!response.ok) {
      return { ok: false, error: `Cloud TTS failed: ${response.status} ${response.statusText}` };
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    try {
      await audio.play();
    } finally {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message || "Cloud TTS playback failed." };
  }
}

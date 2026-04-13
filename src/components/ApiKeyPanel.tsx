// abstract: Captures user-provided API key in memory for local-first runtime usage.
// out_of_scope: Persisting credentials, encryption at rest, and backend auth flows.

import type { TtsMode } from "../types/poker";
import { CLOUD_TTS_VOICE_OPTIONS } from "../lib/voice/cloudTts";

interface ApiKeyPanelProps {
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
  ttsMode: TtsMode;
  onTtsModeChange: (mode: TtsMode) => void;
  cloudVoice: string;
  onCloudVoiceChange: (voice: string) => void;
}

export default function ApiKeyPanel({
  apiKey,
  onApiKeyChange,
  ttsMode,
  onTtsModeChange,
  cloudVoice,
  onCloudVoiceChange
}: ApiKeyPanelProps) {
  return (
    <section className="settings-panel" aria-label="settings-panel">
      <h2>Settings</h2>
      <p>Stored in memory only for this browser session.</p>
      <label htmlFor="api-key">OpenAI API key</label>
      <input
        id="api-key"
        type="password"
        value={apiKey}
        onChange={(event) => onApiKeyChange(event.target.value)}
        placeholder="OpenAI sk-..."
      />

      <label htmlFor="tts-mode">Voice output mode</label>
      <select id="tts-mode" value={ttsMode} onChange={(event) => onTtsModeChange(event.target.value as TtsMode)}>
        <option value="browser_male_cn">Browser male CN</option>
        <option value="cloud_male_cn">Cloud male CN (recommended)</option>
      </select>

      {ttsMode === "cloud_male_cn" ? (
        <>
          <label htmlFor="cloud-voice">Cloud voice</label>
          <select id="cloud-voice" value={cloudVoice} onChange={(event) => onCloudVoiceChange(event.target.value)}>
            {CLOUD_TTS_VOICE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      ) : null}
    </section>
  );
}

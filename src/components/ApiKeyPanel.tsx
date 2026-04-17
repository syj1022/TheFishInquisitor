// abstract: Captures user-provided API key in memory for local-first runtime usage.
// out_of_scope: Persisting credentials, encryption at rest, and backend auth flows.

interface ApiKeyPanelProps {
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
}

export default function ApiKeyPanel({ apiKey, onApiKeyChange }: ApiKeyPanelProps) {
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
    </section>
  );
}

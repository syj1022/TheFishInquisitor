// abstract: Top-level application shell for TheFishInquisitor.
// out_of_scope: Hand parsing, evaluation, and commentary generation internals.

import { useMemo, useState } from "react";
import ApiKeyPanel from "./components/ApiKeyPanel";
import HandInputPanel from "./components/HandInputPanel";
import { buildCommentary, type CommentaryPayload } from "./lib/commentary/styleCommentary";
import { createOpenAIEvaluationClient } from "./lib/evaluation/openaiEvaluator";
import { createRuleHeuristicEngine } from "./lib/evaluation/ruleHeuristicEngine";
import { playVoicepackLine } from "./lib/voice/voicepack";
import type { CritiqueEngineMode, HandScenario, InfoMode } from "./types/poker";

export default function App() {
  const ruleEngine = useMemo(() => createRuleHeuristicEngine(), []);
  const [apiKey, setApiKey] = useState("");
  const [scenario, setScenario] = useState<HandScenario | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [mode, setMode] = useState<InfoMode>("revealed_cards");
  const [commentary, setCommentary] = useState<CommentaryPayload | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [voiceDebugMessage, setVoiceDebugMessage] = useState<string | null>(null);
  const openAIEvaluator = useMemo(
    () => (apiKey.trim() ? createOpenAIEvaluationClient({ apiKey }) : undefined),
    [apiKey]
  );

  const handleScenarioReady = (nextScenario: HandScenario) => {
    setScenario(nextScenario);
    const hasSelectedPlayer = nextScenario.players.some((player) => player.id === selectedPlayerId);
    setSelectedPlayerId(hasSelectedPlayer ? selectedPlayerId : nextScenario.players[0]?.id ?? "");
    setCommentary(null);
    setStatusMessage(null);
    setVoiceDebugMessage(null);
  };

  const handleCritiqueRequest = async (
    nextScenario: HandScenario,
    targetPlayerId: string,
    nextMode: InfoMode,
    critiqueEngineMode: CritiqueEngineMode
  ): Promise<string | null> => {
    setScenario(nextScenario);
    setSelectedPlayerId(targetPlayerId);
    setMode(nextMode);
    try {
      const evaluation =
        critiqueEngineMode === "openai_global"
          ? await openAIEvaluator?.evaluate(nextScenario, targetPlayerId, nextMode)
          : ruleEngine.evaluate(nextScenario, targetPlayerId, nextMode);

      if (!evaluation) {
        const missingError = "OpenAI global eval requires a valid OpenAI API key.";
        setStatusMessage(missingError);
        return missingError;
      }

      const nextCommentary = buildCommentary(evaluation, nextScenario);
      setCommentary(nextCommentary);
      const voiceResult = await playVoicepackLine(nextCommentary.roastLine);
      setVoiceDebugMessage(
        voiceResult.ok
          ? `Voice clip: ${voiceResult.clipLabel ?? "unknown"} (${voiceResult.clipUrl ?? "no-url"})`
          : null
      );
      setStatusMessage(voiceResult.ok ? null : voiceResult.error ?? "Voice playback failed.");
      return null;
    } catch (error) {
      const message = (error as Error).message || "Critique evaluation failed.";
      setStatusMessage(message);
      return message;
    }
  };

  const handleVoicePlayback = async (line: string) => {
    const result = await playVoicepackLine(line);
    setVoiceDebugMessage(
      result.ok ? `Voice clip: ${result.clipLabel ?? "unknown"} (${result.clipUrl ?? "no-url"})` : null
    );
    setStatusMessage(result.ok ? null : result.error ?? "Voice playback failed.");
  };

  return (
    <main>
      <header className="page-header">
        <h1>TheFishInquisitor</h1>
        <details className="settings-menu">
          <summary>Settings</summary>
          <ApiKeyPanel
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
          />
        </details>
      </header>
      <HandInputPanel
        onScenarioReady={handleScenarioReady}
        onCritiqueRequested={handleCritiqueRequest}
        commentary={commentary}
        statusMessage={statusMessage}
        voiceDebugMessage={voiceDebugMessage}
        onReplayVoice={handleVoicePlayback}
      />
    </main>
  );
}

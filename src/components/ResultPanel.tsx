// abstract: Displays short roast commentary, optional GTO reason, and replay interactions.
// out_of_scope: Upstream scenario parsing, evaluation scoring, and API key handling.

import { useEffect, useState } from "react";
import type { CommentaryPayload } from "../lib/commentary/styleCommentary";

interface ResultPanelProps {
  commentary: CommentaryPayload | null;
  autoPlay?: (line: string) => void;
  onReplay?: (line: string) => void;
}

export default function ResultPanel({ commentary, autoPlay, onReplay }: ResultPanelProps) {
  const [showReason, setShowReason] = useState(false);

  useEffect(() => {
    if (!commentary) {
      return;
    }
    autoPlay?.(commentary.roastLine);
  }, [commentary, autoPlay]);

  if (!commentary) {
    return (
      <section aria-label="result-panel">
        <h2>Critique</h2>
        <p>No critique yet.</p>
      </section>
    );
  }

  return (
    <section aria-label="result-panel">
      <h2>Critique</h2>
      <p>{commentary.roastLine}</p>
      <button type="button" onClick={() => setShowReason((value) => !value)}>
        View GTO reason
      </button>
      <button type="button" onClick={() => onReplay?.(commentary.roastLine)}>
        Replay voice
      </button>
      {showReason ? <p>{commentary.gtoReason}</p> : null}
    </section>
  );
}

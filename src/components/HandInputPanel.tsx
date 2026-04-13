// abstract: Unified hand-entry panel with table-first manual editing and critique controls.
// out_of_scope: Strategy evaluation logic and critique voice synthesis internals.

import { useEffect, useMemo, useState } from "react";
import PokerTablePreview from "./manual/PokerTablePreview";
import { getPositionsForSeatCount, hasDuplicateCards } from "../lib/manual/cardUtils";
import { buildManualInputDraft } from "../lib/manual/manualDraftBuilder";
import { parseManualInput } from "../lib/parser/manualParser";
import type { CommentaryPayload } from "../lib/commentary/styleCommentary";
import { listVoiceOptions, suggestMaleChineseVoiceName, type VoiceOption } from "../lib/voice/tts";
import type { BoardDraft } from "./manual/BoardCardPicker";
import type { PlayerDraft } from "./manual/PlayerSetupPanel";
import type { ActionDraft, ActionsByStreet } from "./manual/StreetActionsEditor";
import type { CritiqueEngineMode, HandScenario, InfoMode, TtsMode } from "../types/poker";

interface HandInputPanelProps {
  onScenarioReady: (scenario: HandScenario) => void;
  onCritiqueRequested: (
    scenario: HandScenario,
    targetPlayerId: string,
    mode: InfoMode,
    critiqueEngineMode: CritiqueEngineMode,
    preferredVoiceName?: string
  ) => Promise<string | null> | string | null;
  commentary: CommentaryPayload | null;
  statusMessage: string | null;
  onReplayVoice: (line: string, preferredVoiceName?: string) => void;
  ttsMode: TtsMode;
}

const DEFAULT_HAND_ID = "demo-hand";
const DEFAULT_POT_SIZE = "3";
const DEFAULT_SEAT_COUNT = 2;
const AVATAR_SRC = "/assets/shiqiang.png";
const DEFAULT_PLAYER_NAMES = [
  "Hero",
  "Villain",
  "Player 3",
  "Player 4",
  "Player 5",
  "Player 6",
  "Player 7",
  "Player 8",
  "Player 9"
];
const DEFAULT_HOLE_CARDS: Array<[string, string]> = [
  ["As", "Kd"],
  ["Qh", "Qc"],
  ["Js", "Td"],
  ["9h", "9c"],
  ["8s", "7s"],
  ["6h", "6d"],
  ["Ac", "5c"],
  ["Kh", "Th"],
  ["4s", "4d"]
];

function createInitialPlayers(seatCount: number, previousPlayers?: PlayerDraft[]): PlayerDraft[] {
  const positionOptions = getPositionsForSeatCount(seatCount);
  return Array.from({ length: seatCount }, (_, index) => {
    const fallbackCards = DEFAULT_HOLE_CARDS[index] ?? ["", ""];
    const previous = previousPlayers?.[index];
    const previousPosition = previous?.position;
    return {
      name: previous?.name ?? DEFAULT_PLAYER_NAMES[index] ?? `Player ${index + 1}`,
      position:
        previousPosition && positionOptions.includes(previousPosition) ? previousPosition : positionOptions[index],
      stack: previous?.stack ?? "100",
      holeCards: [previous?.holeCards[0] ?? fallbackCards[0], previous?.holeCards[1] ?? fallbackCards[1]]
    };
  });
}

function flattenSelectedCards(players: PlayerDraft[], board: BoardDraft): string[] {
  return [...players.flatMap((player) => player.holeCards), ...board.flop, board.turn, board.river].filter(
    (card): card is string => Boolean(card)
  );
}

function normalizeStreetRows(seatCount: number, previousRows?: ActionDraft[]): ActionDraft[] {
  const allowedActorIds = new Set(Array.from({ length: seatCount }, (_, index) => `p${index + 1}`));
  return (previousRows ?? []).filter((row) => allowedActorIds.has(row.actorId));
}

function createActionsByStreet(seatCount: number, previous?: ActionsByStreet): ActionsByStreet {
  return {
    preflop: normalizeStreetRows(seatCount, previous?.preflop),
    flop: normalizeStreetRows(seatCount, previous?.flop),
    turn: normalizeStreetRows(seatCount, previous?.turn),
    river: normalizeStreetRows(seatCount, previous?.river)
  };
}

function normalizeLang(raw: string): string {
  return raw.toLowerCase().replace("_", "-");
}

function getCnVoiceOptions(options: VoiceOption[]): VoiceOption[] {
  const chinese = options.filter((option) => option.isChinese || normalizeLang(option.lang).startsWith("zh-"));
  return chinese.sort((left, right) => {
    const leftLang = normalizeLang(left.lang);
    const rightLang = normalizeLang(right.lang);
    const leftMainland = leftLang.startsWith("zh-cn") ? 1 : 0;
    const rightMainland = rightLang.startsWith("zh-cn") ? 1 : 0;
    if (leftMainland !== rightMainland) {
      return rightMainland - leftMainland;
    }
    const leftMale = left.hasMaleHint ? 1 : 0;
    const rightMale = right.hasMaleHint ? 1 : 0;
    if (leftMale !== rightMale) {
      return rightMale - leftMale;
    }
    return left.name.localeCompare(right.name);
  });
}

export default function HandInputPanel({
  onScenarioReady,
  onCritiqueRequested,
  commentary,
  statusMessage,
  onReplayVoice,
  ttsMode
}: HandInputPanelProps) {
  const [seatCount, setSeatCount] = useState(DEFAULT_SEAT_COUNT);
  const [players, setPlayers] = useState<PlayerDraft[]>(() => createInitialPlayers(DEFAULT_SEAT_COUNT));
  const [board, setBoard] = useState<BoardDraft>({
    flop: [undefined, undefined, undefined],
    turn: undefined,
    river: undefined
  });
  const [actionsByStreet, setActionsByStreet] = useState<ActionsByStreet>(() =>
    createActionsByStreet(DEFAULT_SEAT_COUNT)
  );
  const [targetPlayerId, setTargetPlayerId] = useState("p1");
  const [mode, setMode] = useState<InfoMode>("revealed_cards");
  const [critiqueEngineMode, setCritiqueEngineMode] = useState<CritiqueEngineMode>("rule_engine");
  const [showReason, setShowReason] = useState(false);
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
  const [preferredVoiceName, setPreferredVoiceName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const occupiedCards = useMemo(() => flattenSelectedCards(players, board), [players, board]);
  const canShowReason = Boolean(commentary?.gtoReason);
  const cnVoiceOptions = useMemo(() => getCnVoiceOptions(voiceOptions), [voiceOptions]);
  const cnMaleVoiceOptions = useMemo(
    () => cnVoiceOptions.filter((option) => option.hasMaleHint && !option.hasFemaleHint),
    [cnVoiceOptions]
  );

  useEffect(() => {
    setShowReason(false);
  }, [commentary?.roastLine, commentary?.gtoReason]);

  useEffect(() => {
    const refreshVoices = () => {
      const nextOptions = listVoiceOptions();
      const nextCnOptions = getCnVoiceOptions(nextOptions);
      const nextCnMaleOptions = nextCnOptions.filter((option) => option.hasMaleHint && !option.hasFemaleHint);
      setVoiceOptions(nextOptions);
      const hasCurrent = nextCnMaleOptions.some((option) => option.name === preferredVoiceName);
      if (!hasCurrent) {
        const suggested = suggestMaleChineseVoiceName(nextCnMaleOptions);
        setPreferredVoiceName(suggested ?? "");
      }
    };

    refreshVoices();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const synthesis = window.speechSynthesis;
      synthesis.addEventListener?.("voiceschanged", refreshVoices);
      return () => {
        synthesis.removeEventListener?.("voiceschanged", refreshVoices);
      };
    }
    return undefined;
  }, [preferredVoiceName, ttsMode]);

  const handleSeatCountChange = (nextSeatCount: number) => {
    setSeatCount(nextSeatCount);
    setPlayers((previous) => createInitialPlayers(nextSeatCount, previous));
    setActionsByStreet((previous) => createActionsByStreet(nextSeatCount, previous));
    if (Number(targetPlayerId.slice(1)) > nextSeatCount) {
      setTargetPlayerId("p1");
    }
  };

  const handlePlayerChange = (index: number, next: PlayerDraft) => {
    setPlayers((previous) => {
      const updated = [...previous];
      updated[index] = next;
      return updated;
    });
  };

  const handleHoleCardChange = (index: number, cardIndex: 0 | 1, card: string | undefined) => {
    setPlayers((previous) => {
      const updated = [...previous];
      const target = updated[index];
      const nextHoleCards: PlayerDraft["holeCards"] = [...target.holeCards] as PlayerDraft["holeCards"];
      nextHoleCards[cardIndex] = card;
      updated[index] = { ...target, holeCards: nextHoleCards };
      return updated;
    });
  };

  const buildManualScenario = (): HandScenario | null => {
    const inputErrors: string[] = [];
    const positions = players.map((player) => player.position);
    if (new Set(positions).size !== positions.length) {
      inputErrors.push("Player positions must be unique.");
    }
    if (hasDuplicateCards(occupiedCards)) {
      inputErrors.push("Cards must be unique across hole cards and board.");
    }

    const buildResult = buildManualInputDraft({
      handId: DEFAULT_HAND_ID,
      players,
      board,
      potSize: DEFAULT_POT_SIZE,
      actionsByStreet
    });

    if (!buildResult.ok) {
      inputErrors.push(...buildResult.errors);
    }

    if (inputErrors.length > 0) {
      setErrorMessage(inputErrors.join(" "));
      return null;
    }

    const parseResult = parseManualInput(buildResult.draft);
    if (!parseResult.ok) {
      setErrorMessage(parseResult.errors.join(" "));
      return null;
    }

    setErrorMessage(null);
    return parseResult.scenario;
  };

  const handleSubmit = () => {
    const scenario = buildManualScenario();
    if (!scenario) {
      return;
    }
    onScenarioReady(scenario);
  };

  const handleCritique = async () => {
    const scenario = buildManualScenario();
    if (!scenario) {
      return;
    }
    onScenarioReady(scenario);
    const critiqueError = await onCritiqueRequested(
      scenario,
      targetPlayerId,
      mode,
      critiqueEngineMode,
      preferredVoiceName || undefined
    );
    if (critiqueError) {
      setErrorMessage(critiqueError);
      return;
    }
    setErrorMessage(null);
  };

  return (
    <section aria-label="manual-hand-panel">
      <div className="table-workspace">
        <PokerTablePreview
          seatCount={seatCount}
          players={players}
          board={board}
          actionsByStreet={actionsByStreet}
          occupiedCards={occupiedCards}
          onSeatCountChange={handleSeatCountChange}
          onPlayerChange={handlePlayerChange}
          onHoleCardChange={handleHoleCardChange}
          onBoardChange={setBoard}
          onActionsChange={setActionsByStreet}
        />

        <aside className="coach-panel">
          <h3>听世强锐评</h3>
          <img className="coach-avatar" src={AVATAR_SRC} alt="Coach avatar" />

          <label htmlFor="target-player">Target player</label>
          <select id="target-player" value={targetPlayerId} onChange={(event) => setTargetPlayerId(event.target.value)}>
            {players.map((player, index) => (
              <option key={`target-${index}`} value={`p${index + 1}`}>
                {player.name || `Player ${index + 1}`}
              </option>
            ))}
          </select>

          <label htmlFor="mode-select">Info mode</label>
          <select id="mode-select" value={mode} onChange={(event) => setMode(event.target.value as InfoMode)}>
            <option value="revealed_cards">Revealed cards</option>
            <option value="incomplete_info">Incomplete info</option>
          </select>

          <label htmlFor="critique-engine-mode">Evaluation engine</label>
          <select
            id="critique-engine-mode"
            value={critiqueEngineMode}
            onChange={(event) => setCritiqueEngineMode(event.target.value as CritiqueEngineMode)}
          >
            <option value="rule_engine">Rule engine (local)</option>
            <option value="openai_global">OpenAI global eval</option>
          </select>

          {ttsMode === "browser_male_cn" ? (
            <>
              <label htmlFor="voice-select">Voice (male)</label>
              <select
                id="voice-select"
                value={preferredVoiceName}
                onChange={(event) => setPreferredVoiceName(event.target.value)}
                disabled={cnMaleVoiceOptions.length === 0}
              >
                {cnMaleVoiceOptions.map((option) => (
                  <option key={option.name} value={option.name}>
                    {`${option.name} (${option.lang})`}
                  </option>
                ))}
              </select>
              {cnMaleVoiceOptions.length === 0 ? (
                <p className="coach-status-text">当前环境未检测到中文男声语音。</p>
              ) : null}

              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  const nextOptions = listVoiceOptions();
                  const nextCnOptions = getCnVoiceOptions(nextOptions);
                  const nextCnMaleOptions = nextCnOptions.filter(
                    (option) => option.hasMaleHint && !option.hasFemaleHint
                  );
                  setVoiceOptions(nextOptions);
                  const suggested = suggestMaleChineseVoiceName(nextCnMaleOptions);
                  if (!nextCnMaleOptions.some((option) => option.name === preferredVoiceName)) {
                    setPreferredVoiceName(suggested ?? "");
                  }
                }}
              >
                Refresh voices
              </button>
            </>
          ) : null}

          <button type="button" onClick={handleCritique}>
            Critique
          </button>

          <button type="button" className="secondary-button" disabled={!canShowReason} onClick={() => setShowReason((value) => !value)}>
            View GTO reason
          </button>

          <button
            type="button"
            className="secondary-button"
            disabled={!commentary}
            onClick={() => commentary && onReplayVoice(commentary.roastLine, preferredVoiceName || undefined)}
          >
            Replay voice
          </button>

          <button type="button" className="secondary-button" onClick={handleSubmit}>
            Submit Manual Hand
          </button>

          {commentary && showReason ? (
            <div className="coach-commentary-block">
              <p className="coach-commentary-reason">{commentary.gtoReason}</p>
            </div>
          ) : null}

          {statusMessage ? <p className="coach-status-text">{statusMessage}</p> : null}
        </aside>
      </div>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
    </section>
  );
}

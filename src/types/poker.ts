// abstract: Shared poker domain types used by input and evaluation modules.
// out_of_scope: Concrete parser rules and strategy-evaluation implementations.

export type Street = "preflop" | "flop" | "turn" | "river";
export type InfoMode = "revealed_cards" | "incomplete_info";
export type CritiqueEngineMode = "rule_engine" | "openai_global";
export type TtsMode = "browser_male_cn" | "cloud_male_cn";
export type PlayerAction = "fold" | "check" | "call" | "bet" | "raise" | "all_in";
export type CardCode = `${string}${string}`;
export type TablePosition =
  | "UTG"
  | "UTG+1"
  | "MP"
  | "MP1"
  | "MP2"
  | "HJ"
  | "CO"
  | "BTN"
  | "SB"
  | "BB";

export interface PlayerSeat {
  id: string;
  name: string;
  stack: number;
  position: TablePosition;
}

export interface HandAction {
  street: Street;
  actorId: string;
  action: PlayerAction;
  amount?: number;
}

export interface HandScenario {
  handId: string;
  players: PlayerSeat[];
  potSize: number;
  actions: HandAction[];
  board?: {
    flop?: CardCode[];
    turn?: CardCode;
    river?: CardCode;
  };
  holeCards?: Record<string, [CardCode, CardCode]>;
}

export type ManualInputDraft = HandScenario;

export interface EvaluationResult {
  targetPlayerId: string;
  verdict: "good" | "questionable" | "bad";
  severity: 0 | 1 | 2 | 3;
  summary: string;
  rationale: string[];
  alternativeLine?: string;
}

export type ParseResult =
  | {
      ok: true;
      scenario: HandScenario;
    }
  | {
      ok: false;
      errors: string[];
    };

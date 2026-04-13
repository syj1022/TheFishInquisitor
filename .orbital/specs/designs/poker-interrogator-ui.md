---
abstract: Module design for the browser-only FishInquisitor MVP experience and evaluation pipeline.
out_of_scope: Backend service architecture, real-time multiplayer sync, and production solver integration internals.
---

# Poker Interrogator UI Design

## Scope And Traceability

This module implements the complete browser MVP flow that satisfies:
`R-001` to `R-011`.

## Context

- Runtime target: single-page web app.
- Deployment target: local/dev environment first.
- Product decision: no backend in MVP; model calls originate from the browser.
- Security tradeoff acknowledged: API key exposure risk is accepted for MVP speed.

## Module Boundaries

### 1) Hand Input Module

Responsibilities:
- Collect manual per-street actions via structured form controls.
- Collect natural-language hand prompt.
- Enforce required player/position/stack/street fields before submission.
- Provide configurable seat count from 2 to 9 players.
- Provide visual card pickers for both private and public cards.

Outputs:
- `HandScenarioDraft` for either entry path.

### 2) Parsing Module

Responsibilities:
- Convert manual input into canonical scenario.
- Convert natural-language prompt into canonical scenario using strict JSON schema extraction.
- Return validation errors with actionable fixes.

Outputs:
- `HandScenario` or `ParseError[]`.

### 3) Evaluation Module

Responsibilities:
- Provide `EvaluationEngine` interface:
  - `evaluate(scenario, targetPlayerId, infoMode): EvaluationResult`
- Implement `RuleHeuristicEngine` for MVP.
- Reserve `SolverEngineAdapter` with same interface for future replacement.

Outputs:
- `EvaluationResult` containing verdict label, severity, rationale points, and recommended alternative action.

### 4) Style Commentary Module

Responsibilities:
- Convert `EvaluationResult` into:
  - `roastLine`: short roommate-style line.
  - `gtoReason`: technical explanation for expansion panel.
- Restrict short-line generation to approved phrase inventory and tone policy.

Phrase inventory baseline:
- "鱼"
- "你干嘛啊"
- "纯在找爸爸"
- "你在讲什么鬼故事"
- "该你收池，打得有问题，不该call的"
- "太overplay了"
- "没必要"
- "好fo好fo"
- "好打好打"
- "打得没问题"

### 5) Voice Output Module

Responsibilities:
- Auto-play top-line comment immediately after critique trigger.
- Use fixed male TTS voice configuration.
- Gracefully degrade to text-only if synthesis/playback fails.

### 6) Review Control Module

Responsibilities:
- Choose target player.
- Toggle info mode (`revealed_cards` default, `incomplete_info` optional).
- Show history of recent critiques.
- Provide "View GTO reason" expansion action.

## Canonical Data Contracts

```ts
type Street = "preflop" | "flop" | "turn" | "river";
type InfoMode = "revealed_cards" | "incomplete_info";

interface HandAction {
  street: Street;
  actorId: string;
  action: "fold" | "check" | "call" | "bet" | "raise" | "all_in";
  amount?: number;
}

interface HandScenario {
  handId: string;
  players: { id: string; name: string; stack: number; position: string }[];
  board: { flop?: string[]; turn?: string; river?: string };
  holeCards?: Record<string, [string, string]>;
  potSize: number;
  actions: HandAction[];
}

interface EvaluationResult {
  targetPlayerId: string;
  verdict: "good" | "questionable" | "bad";
  severity: 0 | 1 | 2 | 3;
  summary: string;
  rationale: string[];
  alternativeLine?: string;
}
```

## Flow Design

1. User inputs hand (manual or prompt).
2. Parser returns canonical scenario or structured errors.
3. User selects target player + info mode.
4. Evaluation engine computes GTO-first verdict and rationale.
5. Commentary module builds roommate-style short line + technical reason.
6. UI renders short line immediately, enables detail expansion.
7. Voice module auto-plays short line.

## Manual Builder UI Design

The manual input path SHALL be form-driven (not raw JSON editing by default) and include:

### Seat Configuration

- User selects player count in the range `2..9`.
- System renders one player row per seat.
- Each row captures:
  - `name`
  - `position`
  - `stack`
  - `hole card 1`
  - `hole card 2`
- Position choices are constrained by table size:
  - 2 players: `BTN`, `BB`
  - 3 players: `BTN`, `SB`, `BB`
  - 4 players: `CO`, `BTN`, `SB`, `BB`
  - 5 players: `HJ`, `CO`, `BTN`, `SB`, `BB`
  - 6 players: `UTG`, `HJ`, `CO`, `BTN`, `SB`, `BB`
  - 7 players: `UTG`, `MP`, `HJ`, `CO`, `BTN`, `SB`, `BB`
  - 8 players: `UTG`, `UTG+1`, `MP`, `HJ`, `CO`, `BTN`, `SB`, `BB`
  - 9 players: `UTG`, `UTG+1`, `MP1`, `MP2`, `HJ`, `CO`, `BTN`, `SB`, `BB`

### Card Selection Model

- Card selection uses a visible 52-card grid picker.
- Card format remains rank+suit (`Ah`, `Td`, `7c`, etc.).
- The system enforces global uniqueness:
  - A card used in any player's hand cannot be reused in board cards.
  - A board card cannot be reused in another board slot.
- Disabled card rendering is required for already-occupied cards.

### Board Selection

- Public cards are selected per street:
  - `flop`: 3 slots
  - `turn`: 1 slot
  - `river`: 1 slot
- Each slot opens the same card-grid picker with uniqueness constraints.
- Each board slot supports explicit clear/reset during manual edits.

### Action Timeline By Street

- Actions are edited in street sections (`preflop`, `flop`, `turn`, `river`).
- Each action row includes:
  - actor select (`player id`)
  - action select (`fold/check/call/bet/raise/all_in`)
  - amount input (required for `call/bet/raise/all_in`, hidden for `fold/check`)
- Rows support append and remove operations.
- Submission serializer flattens street sections into canonical `actions[]` with street field.

### Validation And Error Surface

- Submit is blocked when any required player field is missing.
- Submit is blocked for duplicate positions.
- Submit is blocked for duplicate cards across all private/public slots.
- Submit is blocked when amount-required actions have missing/non-positive amount.
- Error messages are displayed at the input panel and remain user-actionable.

### Compatibility Constraints

- Prompt parsing path remains available and unchanged in user flow.
- The output contract remains `HandScenario`, preserving downstream evaluator/commentary modules.

## Heuristic Evaluation Strategy (MVP)

Rule groups:
- Range pressure mismatch (over-bluff / under-bluff signals).
- Pot-odds mismatch (calls that fail required equity threshold).
- Bet-sizing inconsistency (polar vs merged sizing conflicts).
- Stack-depth sensitivity (SPR-aware aggression checks).
- Position leverage misuse (OOP overplay and missed IP pressure).

Scoring:
- Each triggered rule contributes weighted penalty or reward.
- Aggregate score maps to `good/questionable/bad`.
- Technical explanation lists top 2-4 highest-impact rule triggers.

## Error Handling

- Parse failure: return field-level fix hints; block evaluation.
- Unsupported scenario: return explicit "insufficient confidence" result.
- Voice failure: preserve text result and show playback warning.
- Model format drift: reject non-schema JSON and request re-parse.

## Testing Design

- Unit tests:
  - manual parser normalization.
  - prompt parser schema validation and error recovery.
  - rule engine score mapping.
  - commentary phrase policy guardrails.
- Component tests:
  - target player switching.
  - auto-play on critique.
  - "View GTO reason" toggle behavior.
- E2E smoke:
  - end-to-end path from input to voiced critique.

## Non-Goals For This Module

- Real-money hand-history ingestion from poker sites.
- Online shared table sessions.
- Full solver parity with commercial tools.

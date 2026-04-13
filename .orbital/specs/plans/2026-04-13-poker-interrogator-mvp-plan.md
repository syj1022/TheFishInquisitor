---
abstract: Implementation plan for a browser-only FishInquisitor MVP with dual input, GTO-first evaluation, and auto voice critique.
out_of_scope: Backend deployment choreography, enterprise observability stacks, and production solver rollout.
---

# FishInquisitor MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Plan ID:** `2026-04-13-poker-interrogator-mvp-plan`

**Goal:** Build a local-first web MVP that ingests poker hands (manual + prompt), critiques a selected player with GTO-first heuristics, and auto-plays roommate-style voice comments.

**Architecture:** Implement a React + TypeScript single-page application with a strict module split: input/parsing, evaluation core, commentary, voice output, and review controls. Keep evaluation behind an interface so rule heuristics power MVP while a solver adapter remains drop-in ready.

**Input Specs:**
- Requirements: `/Users/yingjies/Code/FishInquisitor/.orbital/specs/requirements.md`
- Designs: `/Users/yingjies/Code/FishInquisitor/.orbital/specs/designs/poker-interrogator-ui.md`

**Assumptions and Constraints:**
- No backend service is introduced in MVP.
- API key is user-provided at runtime and kept in volatile memory only.
- All code/comments remain English.
- The app must degrade gracefully when TTS or model parsing fails.

**Decision Gates:** None at plan time.

**Tech Stack:** React, TypeScript, Vite, Vitest, React Testing Library, Zod.

## File Structure Map

- `/Users/yingjies/Code/FishInquisitor/package.json`: app scripts and dependencies.
- `/Users/yingjies/Code/FishInquisitor/index.html`: Vite root document.
- `/Users/yingjies/Code/FishInquisitor/src/main.tsx`: React bootstrapping.
- `/Users/yingjies/Code/FishInquisitor/src/App.tsx`: top-level composition.
- `/Users/yingjies/Code/FishInquisitor/src/types/poker.ts`: core data contracts.
- `/Users/yingjies/Code/FishInquisitor/src/lib/parser/manualParser.ts`: manual input normalization.
- `/Users/yingjies/Code/FishInquisitor/src/lib/parser/promptParser.ts`: prompt-to-schema extraction pipeline.
- `/Users/yingjies/Code/FishInquisitor/src/lib/evaluation/engine.ts`: evaluator interface.
- `/Users/yingjies/Code/FishInquisitor/src/lib/evaluation/ruleHeuristicEngine.ts`: rule-based scoring.
- `/Users/yingjies/Code/FishInquisitor/src/lib/evaluation/solverAdapter.ts`: future solver placeholder.
- `/Users/yingjies/Code/FishInquisitor/src/lib/commentary/styleCommentary.ts`: roommate-style short line + technical rationale shaping.
- `/Users/yingjies/Code/FishInquisitor/src/lib/voice/tts.ts`: fixed-male-voice playback and fallback behavior.
- `/Users/yingjies/Code/FishInquisitor/src/components/HandInputPanel.tsx`: dual input UI.
- `/Users/yingjies/Code/FishInquisitor/src/components/ReviewControlPanel.tsx`: target selection and mode switch.
- `/Users/yingjies/Code/FishInquisitor/src/components/ResultPanel.tsx`: short line, reason toggle, history.
- `/Users/yingjies/Code/FishInquisitor/src/components/ApiKeyPanel.tsx`: volatile runtime key capture.
- `/Users/yingjies/Code/FishInquisitor/src/styles/app.css`: UI layout and theme.
- `/Users/yingjies/Code/FishInquisitor/tests/unit/*.test.ts`: parser/evaluator/commentary unit tests.
- `/Users/yingjies/Code/FishInquisitor/tests/components/*.test.tsx`: UI behavior tests.
- `/Users/yingjies/Code/FishInquisitor/tests/e2e/app-smoke.test.ts`: workflow smoke test.

## Chunk 1: Project Foundation

### Task T01: Scaffold React App And Test Harness

**Task ID:** `T01`  
**Commit Ownership:** Controller at task end (single commit)

**Files:**
- Create: `/Users/yingjies/Code/FishInquisitor/package.json`, `/Users/yingjies/Code/FishInquisitor/index.html`, `/Users/yingjies/Code/FishInquisitor/vite.config.ts`, `/Users/yingjies/Code/FishInquisitor/tsconfig.json`, `/Users/yingjies/Code/FishInquisitor/src/main.tsx`, `/Users/yingjies/Code/FishInquisitor/src/App.tsx`
- Create: `/Users/yingjies/Code/FishInquisitor/tests/components/app-shell.test.tsx`, `/Users/yingjies/Code/FishInquisitor/tests/setup.ts`
- Spec: `/Users/yingjies/Code/FishInquisitor/.orbital/specs/designs/poker-interrogator-ui.md` (if scaffolding decisions diverge)

- [ ] **Step 1: Write the failing app-shell test**

```tsx
import { render, screen } from "@testing-library/react";
import App from "../../src/App";

test("renders FishInquisitor title", () => {
  render(<App />);
  expect(screen.getByText("FishInquisitor")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- app-shell.test.tsx`  
Expected: FAIL (missing React app/test setup).

- [ ] **Step 3: Implement minimal scaffold and app shell**

```tsx
export default function App() {
  return <h1>FishInquisitor</h1>;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test -- app-shell.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Controller commits task**

```bash
git add package.json index.html vite.config.ts tsconfig.json src/main.tsx src/App.tsx tests/components/app-shell.test.tsx tests/setup.ts
git commit -m "feat(app): [plan:2026-04-13-poker-interrogator-mvp-plan][task:T01] scaffold react app and test harness"
```

Anti-pattern avoidance: establish root-cause test tooling once; no silent fallback bootstrap.

## Chunk 2: Input And Parsing

### Task T02: Manual Hand Input And Canonical Normalization

**Task ID:** `T02`  
**Commit Ownership:** Controller at task end (single commit)

**Files:**
- Create: `/Users/yingjies/Code/FishInquisitor/src/types/poker.ts`, `/Users/yingjies/Code/FishInquisitor/src/lib/parser/manualParser.ts`, `/Users/yingjies/Code/FishInquisitor/src/components/HandInputPanel.tsx`
- Create: `/Users/yingjies/Code/FishInquisitor/tests/unit/manual-parser.test.ts`, `/Users/yingjies/Code/FishInquisitor/tests/components/hand-input-panel.test.tsx`
- Modify: `/Users/yingjies/Code/FishInquisitor/src/App.tsx`
- Spec: `/Users/yingjies/Code/FishInquisitor/.orbital/specs/designs/poker-interrogator-ui.md`

- [ ] **Step 1: Write failing parser and component tests**

```ts
test("normalizes ordered manual actions into HandScenario", () => {
  const result = parseManualInput(fixture);
  expect(result.ok).toBe(true);
});
```

- [ ] **Step 2: Run targeted tests and confirm fail**

Run: `npm run test -- manual-parser.test.ts hand-input-panel.test.tsx`  
Expected: FAIL (parser/component missing).

- [ ] **Step 3: Implement minimal parser + manual input UI**

```ts
export function parseManualInput(input: ManualInputDraft): ParseResult {
  // Validate action order and pot consistency before normalization.
  return { ok: true, scenario: normalized };
}
```

- [ ] **Step 4: Re-run tests and confirm pass**

Run: `npm run test -- manual-parser.test.ts hand-input-panel.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Controller commits task**

```bash
git add src/types/poker.ts src/lib/parser/manualParser.ts src/components/HandInputPanel.tsx src/App.tsx tests/unit/manual-parser.test.ts tests/components/hand-input-panel.test.tsx
git commit -m "feat(input): [plan:2026-04-13-poker-interrogator-mvp-plan][task:T02] add manual hand input and normalization"
```

Anti-pattern avoidance: reject inconsistent action sequences explicitly; no permissive silent corrections.

### Task T03: Prompt Parsing With Strict Schema Validation

**Task ID:** `T03`  
**Commit Ownership:** Controller at task end (single commit)

**Files:**
- Create: `/Users/yingjies/Code/FishInquisitor/src/lib/parser/promptParser.ts`, `/Users/yingjies/Code/FishInquisitor/src/lib/parser/schema.ts`
- Create: `/Users/yingjies/Code/FishInquisitor/tests/unit/prompt-parser.test.ts`
- Modify: `/Users/yingjies/Code/FishInquisitor/src/components/HandInputPanel.tsx`
- Spec: `/Users/yingjies/Code/FishInquisitor/.orbital/specs/designs/poker-interrogator-ui.md`

- [ ] **Step 1: Write failing tests for valid and invalid prompt extraction**

```ts
test("returns actionable errors when model output breaks schema", async () => {
  const result = await parsePrompt("messy hand text", fakeClient);
  expect(result.ok).toBe(false);
  expect(result.errors[0]).toContain("missing turn action");
});
```

- [ ] **Step 2: Run test and verify fail**

Run: `npm run test -- prompt-parser.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement prompt parser with zod guard**

```ts
const ScenarioSchema = z.object({ /* ... */ });
```

- [ ] **Step 4: Run test and verify pass**

Run: `npm run test -- prompt-parser.test.ts`  
Expected: PASS.

- [ ] **Step 5: Controller commits task**

```bash
git add src/lib/parser/promptParser.ts src/lib/parser/schema.ts src/components/HandInputPanel.tsx tests/unit/prompt-parser.test.ts
git commit -m "feat(parser): [plan:2026-04-13-poker-interrogator-mvp-plan][task:T03] add prompt parsing with schema validation"
```

Anti-pattern avoidance: fail fast on malformed model output instead of coercing uncertain structures.

## Chunk 3: Evaluation, Commentary, And Voice

### Task T04: Build Evaluation Interface, Rule Engine, And Solver Placeholder

**Task ID:** `T04`  
**Commit Ownership:** Controller at task end (single commit)

**Files:**
- Create: `/Users/yingjies/Code/FishInquisitor/src/lib/evaluation/engine.ts`, `/Users/yingjies/Code/FishInquisitor/src/lib/evaluation/ruleHeuristicEngine.ts`, `/Users/yingjies/Code/FishInquisitor/src/lib/evaluation/solverAdapter.ts`
- Create: `/Users/yingjies/Code/FishInquisitor/tests/unit/rule-engine.test.ts`
- Modify: `/Users/yingjies/Code/FishInquisitor/src/types/poker.ts`
- Spec: `/Users/yingjies/Code/FishInquisitor/.orbital/specs/designs/poker-interrogator-ui.md`

- [ ] **Step 1: Write failing tests for verdict mapping and info mode defaults**

```ts
test("maps weighted rule penalties to questionable verdict", () => {
  const result = engine.evaluate(scenario, "p1", "revealed_cards");
  expect(result.verdict).toBe("questionable");
});
```

- [ ] **Step 2: Run test and confirm fail**

Run: `npm run test -- rule-engine.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement evaluation interface and rule heuristics**

```ts
export interface EvaluationEngine {
  evaluate(scenario: HandScenario, target: string, mode: InfoMode): EvaluationResult;
}
```

- [ ] **Step 4: Re-run tests and confirm pass**

Run: `npm run test -- rule-engine.test.ts`  
Expected: PASS.

- [ ] **Step 5: Controller commits task**

```bash
git add src/lib/evaluation/engine.ts src/lib/evaluation/ruleHeuristicEngine.ts src/lib/evaluation/solverAdapter.ts src/types/poker.ts tests/unit/rule-engine.test.ts
git commit -m "feat(evaluation): [plan:2026-04-13-poker-interrogator-mvp-plan][task:T04] add rule engine and solver-compatible interface"
```

Anti-pattern avoidance: keep solver placeholder explicit and throwing `NotImplemented` rather than fake-success behavior.

### Task T05: Add Style Commentary, Auto Voice Playback, And Review Controls

**Task ID:** `T05`  
**Commit Ownership:** Controller at task end (single commit)

**Files:**
- Create: `/Users/yingjies/Code/FishInquisitor/src/lib/commentary/styleCommentary.ts`, `/Users/yingjies/Code/FishInquisitor/src/lib/voice/tts.ts`
- Create: `/Users/yingjies/Code/FishInquisitor/src/components/ReviewControlPanel.tsx`, `/Users/yingjies/Code/FishInquisitor/src/components/ResultPanel.tsx`, `/Users/yingjies/Code/FishInquisitor/src/components/ApiKeyPanel.tsx`
- Create: `/Users/yingjies/Code/FishInquisitor/tests/unit/style-commentary.test.ts`, `/Users/yingjies/Code/FishInquisitor/tests/components/result-panel.test.tsx`
- Modify: `/Users/yingjies/Code/FishInquisitor/src/App.tsx`
- Spec: `/Users/yingjies/Code/FishInquisitor/.orbital/specs/designs/poker-interrogator-ui.md`

- [ ] **Step 1: Write failing tests for phrase constraints, reason toggle, and auto-play trigger**

```ts
test("commentary short line is selected from approved phrase inventory", () => {
  const line = buildRoastLine(result);
  expect(APPROVED_LINES).toContain(line);
});
```

- [ ] **Step 2: Run tests and confirm fail**

Run: `npm run test -- style-commentary.test.ts result-panel.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement commentary generator, TTS wrapper, and control panels**

```ts
export function playCritiqueVoice(text: string): VoiceResult {
  // Uses speechSynthesis with fixed male voice preference and error surface.
}
```

- [ ] **Step 4: Run tests and confirm pass**

Run: `npm run test -- style-commentary.test.ts result-panel.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Controller commits task**

```bash
git add src/lib/commentary/styleCommentary.ts src/lib/voice/tts.ts src/components/ReviewControlPanel.tsx src/components/ResultPanel.tsx src/components/ApiKeyPanel.tsx src/App.tsx tests/unit/style-commentary.test.ts tests/components/result-panel.test.tsx
git commit -m "feat(review): [plan:2026-04-13-poker-interrogator-mvp-plan][task:T05] add roommate-style critique, reason toggle, and auto voice playback"
```

Anti-pattern avoidance: never hide TTS failure; surface warning while preserving text result.

## Chunk 4: Integration, Verification, And Spec Sync

### Task T06: Wire Full Flow, Add Smoke Test, And Finalize Documentation Sync

**Task ID:** `T06`  
**Commit Ownership:** Controller at task end (single commit)

**Files:**
- Create: `/Users/yingjies/Code/FishInquisitor/tests/e2e/app-smoke.test.ts`
- Modify: `/Users/yingjies/Code/FishInquisitor/src/App.tsx`, `/Users/yingjies/Code/FishInquisitor/src/styles/app.css`
- Modify: `/Users/yingjies/Code/FishInquisitor/.orbital/specs/designs/poker-interrogator-ui.md` (only if implementation changed commitments)
- Modify: `/Users/yingjies/Code/FishInquisitor/README.md` (setup and key-risk note)

- [ ] **Step 1: Write failing smoke test for complete hand-to-voice flow**

```ts
test("manual hand review produces short line, expandable reason, and voice trigger", async () => {
  // Fill input, click critique, assert result + reason toggle + voice adapter call.
});
```

- [ ] **Step 2: Run smoke test and confirm fail**

Run: `npm run test -- app-smoke.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Complete app wiring and UX polish**

```tsx
<HandInputPanel ... />
<ReviewControlPanel ... />
<ResultPanel ... />
```

- [ ] **Step 4: Run full verification suite**

Run: `npm run test`  
Expected: PASS for all unit/component/smoke tests.

- [ ] **Step 5: Controller commits task**

```bash
git add src/App.tsx src/styles/app.css tests/e2e/app-smoke.test.ts README.md .orbital/specs/designs/poker-interrogator-ui.md
git commit -m "feat(flow): [plan:2026-04-13-poker-interrogator-mvp-plan][task:T06] deliver end-to-end critique flow and verification"
```

Anti-pattern avoidance: integrate through shared data contracts; avoid duplicate transformation logic across UI layers.

## Plan Coverage Gate

| Design Commitment | Requirement IDs | Covered Task IDs | Files | Tests | Spec Delta | Planned Commit |
| --- | --- | --- | --- | --- | --- | --- |
| Dual input and normalization | R-001, R-002 | T02, T03 | `src/components/HandInputPanel.tsx`, `src/lib/parser/*.ts`, `src/types/poker.ts` | `manual-parser.test.ts`, `prompt-parser.test.ts`, `hand-input-panel.test.tsx` | `designs/poker-interrogator-ui.md` | `[task:T02]`, `[task:T03]` |
| Target selection + mode switch | R-003, R-008 | T05, T06 | `src/components/ReviewControlPanel.tsx`, `src/App.tsx` | `result-panel.test.tsx`, `app-smoke.test.ts` | `designs/poker-interrogator-ui.md` | `[task:T05]`, `[task:T06]` |
| GTO-first verdict with extensible engine | R-004, R-009 | T04 | `src/lib/evaluation/*.ts` | `rule-engine.test.ts` | `designs/poker-interrogator-ui.md` | `[task:T04]` |
| Style short line + expandable reason | R-005, R-006 | T05, T06 | `src/lib/commentary/styleCommentary.ts`, `src/components/ResultPanel.tsx` | `style-commentary.test.ts`, `result-panel.test.tsx`, `app-smoke.test.ts` | `designs/poker-interrogator-ui.md` | `[task:T05]`, `[task:T06]` |
| Immediate voice playback with transparent fallback | R-007, R-011 | T05, T06 | `src/lib/voice/tts.ts`, `src/components/ResultPanel.tsx` | `result-panel.test.tsx`, `app-smoke.test.ts` | `designs/poker-interrogator-ui.md` | `[task:T05]`, `[task:T06]` |
| Local-first runtime behavior | R-010 | T01, T06 | `src/components/ApiKeyPanel.tsx`, `README.md` | `app-shell.test.tsx`, `app-smoke.test.ts` | `requirements.md` stable, design wording optional | `[task:T01]`, `[task:T06]` |

Coverage checks:
- No behavior-changing commitment is left without task, file, and test mapping.
- Each task has exactly one controller-owned commit step at task end.
- Plan defaults to root-cause fixes and explicit failures; no silent handling strategy is used.
- No planned workaround-only task replaces a direct implementation path.

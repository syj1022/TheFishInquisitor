---
abstract: Implementation plan for replacing JSON-based manual hand entry with a structured configurable poker hand builder UI.
out_of_scope: Solver integration, backend persistence, and multiplayer synchronization.
---

# Manual Hand Builder UI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Plan ID:** `2026-04-13-manual-hand-builder-ui-plan`

**Goal:** Deliver a manual input UI where users can configure 2-9 players, pick positions/cards/actions visually, and submit a valid `HandScenario` without editing raw JSON.

**Architecture:** Keep existing parser/evaluation flow and replace the manual-input presentation layer with a modular form system. Introduce dedicated card-picker and street-action editors that write to one draft state, then serialize through the existing parser boundary.

**Input Specs:**
- Requirements: `/Users/yingjies/Code/FishInquisitor/.orbital/specs/requirements.md`
- Designs: `/Users/yingjies/Code/FishInquisitor/.orbital/specs/designs/poker-interrogator-ui.md`

**Assumptions and Constraints:**
- Prompt-based parsing remains available and must not regress.
- Manual form remains local-first with no backend dependency.
- All code/comments remain English.
- Existing critique/evaluation flow must remain compatible with `HandScenario`.

**Decision Gates:** None.

**Tech Stack:** React, TypeScript, Vitest, React Testing Library.

## File Structure Map

- `/Users/yingjies/Code/FishInquisitor/src/components/HandInputPanel.tsx`: top-level manual input orchestrator.
- `/Users/yingjies/Code/FishInquisitor/src/components/manual/PlayerSetupPanel.tsx`: seat count and per-player fields.
- `/Users/yingjies/Code/FishInquisitor/src/components/manual/CardGridPicker.tsx`: reusable 52-card visual selector.
- `/Users/yingjies/Code/FishInquisitor/src/components/manual/BoardCardPicker.tsx`: flop/turn/river selectors.
- `/Users/yingjies/Code/FishInquisitor/src/components/manual/StreetActionsEditor.tsx`: per-street action rows.
- `/Users/yingjies/Code/FishInquisitor/src/lib/manual/cardUtils.ts`: card deck and uniqueness helpers.
- `/Users/yingjies/Code/FishInquisitor/src/lib/manual/manualDraftBuilder.ts`: draft-to-`ManualInputDraft` serialization.
- `/Users/yingjies/Code/FishInquisitor/src/types/poker.ts`: optional type extensions for UI draft representation.
- `/Users/yingjies/Code/FishInquisitor/tests/components/hand-input-panel.test.tsx`: updated panel behavior tests.
- `/Users/yingjies/Code/FishInquisitor/tests/components/manual/*.test.tsx`: subcomponent tests.
- `/Users/yingjies/Code/FishInquisitor/tests/unit/card-utils.test.ts`: card uniqueness/unit behavior.
- `/Users/yingjies/Code/FishInquisitor/tests/e2e/app-smoke.test.ts`: full-flow smoke with new manual builder.

## Chunk 1: Data And Utility Foundations

### Task T01: Add Card And Position Utility Contracts

**Task ID:** `T01`
**Commit Ownership:** Controller at task end (single commit)

**Files:**
- Create: `/Users/yingjies/Code/FishInquisitor/src/lib/manual/cardUtils.ts`
- Create: `/Users/yingjies/Code/FishInquisitor/tests/unit/card-utils.test.ts`
- Modify: `/Users/yingjies/Code/FishInquisitor/src/types/poker.ts`
- Spec: `/Users/yingjies/Code/FishInquisitor/.orbital/specs/designs/poker-interrogator-ui.md` (only if implementation reveals gaps)

- [ ] **Step 1: Write failing tests for 52-card generation and uniqueness checks**
- [ ] **Step 2: Run `npm run test -- card-utils.test.ts` and verify FAIL**
- [ ] **Step 3: Implement minimal card and position helper logic**
- [ ] **Step 4: Re-run `npm run test -- card-utils.test.ts` and verify PASS**
- [ ] **Step 5: Controller commits task**

```bash
git add src/lib/manual/cardUtils.ts src/types/poker.ts tests/unit/card-utils.test.ts
git commit -m "feat(manual-ui): [plan:2026-04-13-manual-hand-builder-ui-plan][task:T01] add card and position utility contracts"
```

Anti-pattern avoidance: no hidden fallback cards; invalid state is explicit and test-covered.

## Chunk 2: Manual Builder Components

### Task T02: Build Player And Board Selection Components

**Task ID:** `T02`
**Commit Ownership:** Controller at task end (single commit)

**Files:**
- Create: `/Users/yingjies/Code/FishInquisitor/src/components/manual/PlayerSetupPanel.tsx`
- Create: `/Users/yingjies/Code/FishInquisitor/src/components/manual/CardGridPicker.tsx`
- Create: `/Users/yingjies/Code/FishInquisitor/src/components/manual/BoardCardPicker.tsx`
- Create: `/Users/yingjies/Code/FishInquisitor/tests/components/manual/player-setup-panel.test.tsx`
- Create: `/Users/yingjies/Code/FishInquisitor/tests/components/manual/card-grid-picker.test.tsx`
- Create: `/Users/yingjies/Code/FishInquisitor/tests/components/manual/board-card-picker.test.tsx`

- [ ] **Step 1: Write failing component tests for player count/position/card-pick behavior**
- [ ] **Step 2: Run targeted tests and verify FAIL**
- [ ] **Step 3: Implement minimal components with disabled-card and duplicate-position safeguards**
- [ ] **Step 4: Re-run targeted tests and verify PASS**
- [ ] **Step 5: Controller commits task**

```bash
git add src/components/manual/PlayerSetupPanel.tsx src/components/manual/CardGridPicker.tsx src/components/manual/BoardCardPicker.tsx tests/components/manual/player-setup-panel.test.tsx tests/components/manual/card-grid-picker.test.tsx tests/components/manual/board-card-picker.test.tsx
git commit -m "feat(manual-ui): [plan:2026-04-13-manual-hand-builder-ui-plan][task:T02] add player and board card selection components"
```

Anti-pattern avoidance: no silent card conflict override; conflicts stay visible and actionable.

### Task T03: Add Street Action Editor And Draft Serialization

**Task ID:** `T03`
**Commit Ownership:** Controller at task end (single commit)

**Files:**
- Create: `/Users/yingjies/Code/FishInquisitor/src/components/manual/StreetActionsEditor.tsx`
- Create: `/Users/yingjies/Code/FishInquisitor/src/lib/manual/manualDraftBuilder.ts`
- Create: `/Users/yingjies/Code/FishInquisitor/tests/components/manual/street-actions-editor.test.tsx`
- Create: `/Users/yingjies/Code/FishInquisitor/tests/unit/manual-draft-builder.test.ts`

- [ ] **Step 1: Write failing tests for per-street action rows and serializer output**
- [ ] **Step 2: Run targeted tests and verify FAIL**
- [ ] **Step 3: Implement minimal editor and serializer logic**
- [ ] **Step 4: Re-run targeted tests and verify PASS**
- [ ] **Step 5: Controller commits task**

```bash
git add src/components/manual/StreetActionsEditor.tsx src/lib/manual/manualDraftBuilder.ts tests/components/manual/street-actions-editor.test.tsx tests/unit/manual-draft-builder.test.ts
git commit -m "feat(manual-ui): [plan:2026-04-13-manual-hand-builder-ui-plan][task:T03] add street action editor and manual draft serialization"
```

Anti-pattern avoidance: serializer rejects incomplete amount-required actions instead of mutating them.

## Chunk 3: Integration And Verification

### Task T04: Integrate New Manual Builder Into HandInputPanel

**Task ID:** `T04`
**Commit Ownership:** Controller at task end (single commit)

**Files:**
- Modify: `/Users/yingjies/Code/FishInquisitor/src/components/HandInputPanel.tsx`
- Modify: `/Users/yingjies/Code/FishInquisitor/tests/components/hand-input-panel.test.tsx`
- Modify: `/Users/yingjies/Code/FishInquisitor/src/styles/app.css`
- Modify: `/Users/yingjies/Code/FishInquisitor/tests/e2e/app-smoke.test.ts`
- Modify: `/Users/yingjies/Code/FishInquisitor/README.md`

- [ ] **Step 1: Write failing tests for manual form submission through new UI path**
- [ ] **Step 2: Run `npm run test -- hand-input-panel.test.tsx app-smoke.test.ts` and verify FAIL**
- [ ] **Step 3: Replace JSON textarea workflow with structured manual builder orchestration**
- [ ] **Step 4: Re-run targeted tests and verify PASS**
- [ ] **Step 5: Controller commits task**

```bash
git add src/components/HandInputPanel.tsx tests/components/hand-input-panel.test.tsx src/styles/app.css tests/e2e/app-smoke.test.ts README.md
git commit -m "feat(manual-ui): [plan:2026-04-13-manual-hand-builder-ui-plan][task:T04] integrate structured hand builder into manual input panel"
```

Anti-pattern avoidance: preserve parse pipeline boundary; no duplicated parser logic inside UI components.

### Task T05: Full Regression Verification And Spec Sync

**Task ID:** `T05`
**Commit Ownership:** Controller at task end (single commit)

**Files:**
- Modify: `/Users/yingjies/Code/FishInquisitor/.orbital/specs/designs/poker-interrogator-ui.md` (only if implementation diverges from current design)
- Verify: `/Users/yingjies/Code/FishInquisitor/tests/**`

- [ ] **Step 1: Run full suite `npm run test` and verify PASS**
- [ ] **Step 2: Confirm no unresolved TODO/header gaps in changed files**
- [ ] **Step 3: If behavior changed from design text, patch design doc and re-verify**
- [ ] **Step 4: Controller commits final integration verification task**

```bash
git add .orbital/specs/designs/poker-interrogator-ui.md
git commit -m "chore(manual-ui): [plan:2026-04-13-manual-hand-builder-ui-plan][task:T05] finalize verification and spec alignment"
```

Anti-pattern avoidance: no completion claim without fresh full-suite evidence.

## Plan Coverage Gate

| Design Commitment | Requirement IDs | Task IDs | Files | Tests | Spec Delta | Commit Tags |
| --- | --- | --- | --- | --- | --- | --- |
| Configurable players 2-9 with positions | R-001, R-002 | T01, T02, T04 | `PlayerSetupPanel.tsx`, `cardUtils.ts`, `HandInputPanel.tsx` | `player-setup-panel.test.tsx`, `hand-input-panel.test.tsx` | `designs/poker-interrogator-ui.md` | `T01,T02,T04` |
| 52-card visual selection with uniqueness | R-001, R-011 | T01, T02, T04 | `CardGridPicker.tsx`, `BoardCardPicker.tsx`, `cardUtils.ts` | `card-grid-picker.test.tsx`, `board-card-picker.test.tsx`, `card-utils.test.ts` | `designs/poker-interrogator-ui.md` | `T01,T02,T04` |
| Street-section action editor | R-001, R-002 | T03, T04 | `StreetActionsEditor.tsx`, `manualDraftBuilder.ts`, `HandInputPanel.tsx` | `street-actions-editor.test.tsx`, `manual-draft-builder.test.ts` | `designs/poker-interrogator-ui.md` | `T03,T04` |
| Parser compatibility and manual submit flow | R-002, R-011 | T03, T04, T05 | `manualDraftBuilder.ts`, `HandInputPanel.tsx` | `hand-input-panel.test.tsx`, `app-smoke.test.ts`, full suite | Optional final sync | `T03,T04,T05` |

Coverage checks:
- All behavior-changing deltas map to task+file+test.
- Each task has one controller-owned commit step with `[plan:...][task:...]`.
- No workaround-only strategy, silent failure, or duplicate parsing paths are planned.

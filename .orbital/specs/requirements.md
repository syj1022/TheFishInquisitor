---
abstract: Governing product requirements for the roommate-style Texas Hold'em interrogation assistant.
out_of_scope: Real-money poker operations, voice-clone identity simulation, and production compliance frameworks.
---

# FishInquisitor Requirements

## Product Intent

FishInquisitor is a local-first web assistant that lets a user reconstruct a complete Texas Hold'em hand, request a target-player critique, and receive GTO-first feedback in a specific roommate voice style.

## User Stories

- As a hand reviewer, I want to enter a hand either manually or by natural-language prompt so I can review quickly.
- As a serious poker learner, I want technically grounded GTO feedback so the critique improves my decision quality.
- As a social user, I want the critique to sound like my roommate's tone and phrases so the review is entertaining.
- As a reviewer, I want immediate spoken feedback and optional detailed reasoning so I can choose speed or depth.

## EARS Requirements

### R-001 Dual Input Pathways
When the user submits hand data, the system SHALL support both manual action-route entry and prompt-to-structure parsing.

### R-002 Unified Hand Scenario
Where hand data is accepted from any input pathway, the system SHALL normalize it into one shared hand-scenario structure before evaluation.

### R-003 Targeted Player Interrogation
When evaluation is requested, the system SHALL require a selected target player and produce critique specifically for that player.

### R-004 GTO-First Evaluation
When generating strategic judgment, the system SHALL prioritize technically rigorous GTO-aligned reasoning over purely entertainment-focused commentary.

### R-005 Style-Constrained Commentary
When producing the short roast line, the system SHALL keep wording within the configured roommate-style phrase bank and tone constraints.

### R-006 Explainable Critique
When a critique is produced, the system SHALL provide a concise top-line comment and a separate expandable technical rationale.

### R-007 Immediate Voice Playback
When the user triggers critique, the system SHALL automatically play spoken output for the top-line comment without requiring a second click.

### R-008 Information-Set Modes
When evaluation starts, the system SHALL support both revealed-cards mode and incomplete-information mode, with revealed-cards mode selected by default.

### R-009 Extensible Evaluation Engine
Where strategic evaluation is implemented, the system SHALL expose a stable evaluator interface that can accept a future solver-backed implementation without UI redesign.

### R-010 Local-First Operation
When running the MVP, the system SHALL function without mandatory backend services or account sign-in.

### R-011 Transparent Failure Handling
If parsing, evaluation, or voice playback cannot complete, the system SHALL return explicit user-visible failure reasons and SHALL NOT claim successful analysis.

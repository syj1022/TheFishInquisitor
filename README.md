---
abstract: Setup and local usage instructions for TheFishInquisitor browser MVP.
out_of_scope: Production deployment playbooks and backend infrastructure operations.
---

# TheFishInquisitor

Local-first Texas Hold'em review UI with:
- table-first manual builder input (2-9 players, editable seats, visual cards, per-street actions),
- prompt parsing pipeline with schema checks,
- GTO-first heuristic critique,
- roommate-style short commentary,
- immediate browser voice playback.

## Quick Start

```bash
npm install
npm run dev
```

Open the local Vite URL and use the app directly in the browser.

## Manual Builder Flow

1. Set **Number of players** and edit seats directly on the table (name/position/stack/hole cards).
2. Click board cards in the center to set flop/turn/river cards.
3. Use street tabs (**Preflop / Flop / Turn / River**) to set each player's action and sizing.
4. Use the right **Critique Control** panel to choose target player and info mode.
5. Click **Critique** for immediate voice playback.

Validation rules:
- duplicate cards are rejected,
- duplicate positions are rejected,
- call/bet/raise/all-in actions require a positive amount.

Avatar asset path:
- put your image at `public/assets/shiqiang.png`

## Use with OpenAI

1. Start app with `npm run dev`.
2. Paste your OpenAI API key in **Settings**.
3. For TTS, choose **Cloud male CN (recommended)** in settings and pick a voice.

## Test

```bash
npm run test
```

## API Key Handling (MVP)

- API key input is kept in memory only.
- No persistence is implemented in this MVP.
- Frontend-only architecture means browser-side key exposure risk remains.

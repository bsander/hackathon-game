# Modularise MVP for TDD — Blueprint

**Date:** 2026-04-02
**Input:** [MVP design](../2026-04-02-arcane-akash-mvp/design.md), completed `mvp/index.html` (691 lines)

## Goal

Break the single-file MVP into ES modules so that core game logic is testable without a DOM. Set up vitest. The game must remain playable in the browser via a dev server.

## Tasks

### Task 1 — Test infrastructure

Create `package.json` at the repo root with vitest as a dev dependency. ES module mode (`"type": "module"`). Scripts: `test` (single run), `test:watch` (watch mode).

- **Verification:** `npm test` runs and exits cleanly (no tests yet, zero failures).
- **Test intent:** n/a — this is infrastructure.

### Task 2 — Constants module

Create `mvp/js/constants.js`. Extract from `index.html` lines 290–294:
- `SPELLS`, `BEATS`, `P1_KEYS`, `P2_KEYS`
- Add `WIN_SCORE = 3` (currently a magic number on line 596)

All named exports. No imports.

- **Verification:** vitest can import the module; constants match current values.
- **Test intent:** Verify the RPS triangle is complete — every spell beats exactly one other, no spell beats itself, the cycle has no dead ends. Verify `WIN_SCORE` is a positive integer.

### Task 3 — Utils module

Create `mvp/js/utils.js`. Extract from `index.html` lines 340–357:
- `randBetween(min, max)` — unchanged
- `shuffleArray(arr)` — unchanged (Fisher-Yates, returns new array)
- `otherPlayer(p)` — renamed from `defender()`, now takes player number as parameter (currently reads module-level `attacker` global)
- `keysForPlayer(p)` — imports `P1_KEYS`, `P2_KEYS` from constants
- `keyListForPlayer(p)` — same

Signature change: `defender()` → `otherPlayer(attacker)`. All call sites in game.js must update. This is the only API-breaking change in the extraction.

- **Verification:** All functions importable and callable from vitest.
- **Test intent:** `otherPlayer(1) === 2` and vice versa. `shuffleArray` preserves elements and length, returns a new array. `randBetween` returns values within [min, max). `keysForPlayer` returns correct mapping for each player.

### Task 4 — Resolution module

Create `mvp/js/resolution.js`. Extract the pure outcome logic from `resolve()` (lines 559–584) and the next-state decision (lines 590–611):

**`resolveSpells(attackSpell, defendSpell)`** → `{ outcome, attackSpell, defendSpell }`
- `defendSpell === null` → `{ outcome: 'TIMEOUT' }`
- Same spell → `{ outcome: 'CLASH' }`
- `BEATS[defendSpell] === attackSpell` → `{ outcome: 'BLOCKED' }`
- Otherwise → `{ outcome: 'HIT' }`

Returns only the outcome enum. Display text (e.g. "Fireball breaks through Shield") stays in game.js — keeps resolution presentation-free.

**`nextStateAfterResolve(outcome, currentScore, winScore)`** → `{ scoreChange, next }`
- HIT + score+1 >= winScore → `{ scoreChange: 1, next: 'GAME_OVER' }`
- HIT + score+1 < winScore → `{ scoreChange: 1, next: 'NEXT_ROUND' }`
- CLASH or BLOCKED or TIMEOUT with no hit → `{ scoreChange: 0, next: 'SWAP' }`

Wait — TIMEOUT is a HIT. Let me be precise. The outcome from `resolveSpells` is one of: `HIT`, `CLASH`, `BLOCKED`. Timeout is signalled by passing `defendSpell = null`, which produces `HIT`. The caller (game.js) decides display text based on whether defendSpell was null.

Imports `BEATS` from constants.

- **Verification:** All functions importable and callable from vitest.
- **Test intent:** All 9 spell combinations produce the correct outcome (3 HIT, 3 BLOCKED, 3 CLASH). Null defendSpell produces HIT. `nextStateAfterResolve` returns GAME_OVER at exactly WIN_SCORE, NEXT_ROUND below it, SWAP for non-HIT outcomes.

### Task 5 — Tests for extracted modules

Write tests in `mvp/test/`:
- `constants.test.js` — RPS cycle completeness, WIN_SCORE sanity
- `utils.test.js` — all utility functions
- `resolution.test.js` — all outcome permutations, score thresholds

- **Verification:** `npm test` passes with full coverage of exported functions.
- **Test intent:** This IS the test task. Establish the regression safety net before refactoring game.js.

### Task 6 — Game shell

Create `mvp/js/game.js`. Move all remaining JS from `index.html`:
- All mutable state variables
- All DOM refs
- All rendering functions (`renderPips`, `renderRoles`, `renderHints`, `startCountdownBar`, `hideCountdown`, `showOverlay`, `hideOverlay`, `flashAvatar`)
- `clearTimer()`
- `enterState()` — refactored to use imported `otherPlayer()` instead of `defender()`
- `resolve()` — refactored: calls `resolveSpells()` for outcome, builds display text locally, calls `nextStateAfterResolve()` for scoring/routing
- Input handlers and `keydown` listener
- `visibilitychange` pause/resume handler
- `init()` function that calls `enterState('IDLE')`, auto-invoked at module load

Imports from constants, utils, resolution.

- **Verification:** No JS remains inline in index.html. Game.js loads without errors in the browser console.
- **Test intent:** Verify the refactored `resolve()` produces identical behaviour to the original — same outcomes, same score changes, same state transitions. (This is covered by resolution.test.js testing the extracted logic; game.js is the thin wiring layer.)

### Task 7 — Update index.html

- Extract all CSS (lines 7–225) to `mvp/style.css`
- Replace the `<script>` block with `<script type="module" src="js/game.js"></script>`
- Add `<link rel="stylesheet" href="style.css">`
- HTML structure unchanged

- **Verification:** Open via dev server (`npx serve mvp` or `python3 -m http.server`). Game plays identically to the current single-file version. All states, timers, pause/resume, win condition work.
- **Test intent:** Smoke test — full playthrough covering attack, defend, clash, block, hit, timeout, fumble, game over, restart.

## Dependency Ordering

```
Task 1 (test infra)
  └→ Task 2 (constants) ─┐
       └→ Task 3 (utils)  ├→ Task 5 (tests) → Task 6 (game shell) → Task 7 (index.html)
       └→ Task 4 (resolution) ┘
```

Tasks 3 and 4 can be built in parallel after Task 2. Task 5 depends on 2–4. Task 6 depends on 5 (tests provide the safety net for refactoring). Task 7 depends on 6.

## Edge Cases and Failure Modes

| Scenario | Handling |
|----------|----------|
| `defender()` → `otherPlayer()` rename missed at a call site | Tests catch: `otherPlayer` is tested directly; game.js grep for old name |
| ES modules over `file://` protocol | Won't work — document that a dev server is needed (npx serve, python http.server, or npx vite) |
| `enterState` ↔ `resolve` circular dependency | Both stay in game.js — no cross-module cycle. Impact analysis confirmed mutual recursion is timer-mediated, not direct |
| `resolve()` refactor changes behaviour | Resolution tests cover all 9 combos + timeout + score thresholds. Display text is built in game.js, not resolution.js, so presentation logic stays co-located with DOM code |
| Timer/pause state shared across modules | All timer state stays in game.js — no split. Prior learning: every timed state must update `countdownStart`/`countdownDuration`, including REVEAL_DELAY |
| Import order / initialisation timing | game.js auto-calls `init()` at module load. DOM refs are grabbed at module eval time, which is fine because `<script type="module">` is deferred by default |

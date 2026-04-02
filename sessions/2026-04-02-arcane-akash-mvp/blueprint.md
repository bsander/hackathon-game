# Arcane Akash MVP — Blueprint

**Date:** 2026-04-02
**Skills:** ideate, blueprint

## Tasks

### Task 1 — HTML scaffold and layout
Create `mvp/index.html` with the four-region DOM structure (header, arena, centre, footer) and base CSS. No game logic.
- **Verification:** Opening the file in a browser shows all four regions with placeholder content. Win pips, avatar placeholders, spell banner area, countdown bar, and key legend are all visible and legible.
- **Test intent:** Verify the layout is readable at arm's length — text sizing, contrast, spacing.

### Task 2 — State machine and transitions
Implement the state machine (IDLE → ATTACK_PHASE → REVEAL_DELAY → DEFEND_PHASE → RESOLVE → ROUND_END → GAME_OVER) with a single `activeTimer` handle cleared on every transition. Each state stores only its required data. No input handling or rendering yet — just the state transitions with correct timers.
- **Verification:** Calling transition functions manually (from console) cycles through all states in the correct order. Timer durations match spec (3s attack, 200–600ms reveal, 1.6–2.4s defend, 1.2s resolve, 1.5s round end).
- **Test intent:** Verify all state transitions are reachable, timer is always cleared before setting a new one, no orphaned timers on rapid transitions.

### Task 3 — Input handling
Wire the `keydown` dispatch table. Validate keys belong to the active player's map. First valid keypress wins and triggers state transition. Wrong-state and wrong-player presses are no-ops.
- **Verification:** During ATTACK_PHASE, only the attacker's keys are accepted. During DEFEND_PHASE, only the defender's keys (with shuffled mapping) are accepted. All other states ignore input. Rapid key mashing doesn't cause double transitions.
- **Test intent:** Verify input gating per state, verify wrong-player keys are rejected, verify no double-fire on rapid input.

### Task 4 — Key shuffling
On each DEFEND_PHASE entry, randomly reassign the three spells to the defender's three keys using Fisher-Yates shuffle. Store the shuffled mapping in round state.
- **Verification:** Over multiple defend phases, the key-to-spell mapping visibly changes. The shuffled mapping is used for both input resolution and display.
- **Test intent:** Verify shuffled mapping is fresh each defend phase, verify the shuffled mapping is what's used to resolve the defender's choice (not the fixed mapping).

### Task 5 — Spell resolution
Implement the RPS outcome logic: compare attacker's spell vs defender's spell (or timeout). Produce the correct outcome (HIT, BLOCKED, CLASH, TIMEOUT, FUMBLE) and determine next state (round over vs roles swap).
- **Verification:** All 9 spell combinations produce the correct outcome. Timeout produces HIT. Attacker timeout produces FUMBLE. Scores increment correctly. First to 3 wins triggers GAME_OVER.
- **Test intent:** Verify all outcome permutations, verify score tracking, verify win condition triggers at exactly 3.

### Task 6 — Rendering
Connect state machine to DOM updates. Each state transition updates the visible regions: phase label, spell banner, countdown bar (rAF-driven width + colour shift), key legend (contextual to active player, shuffled for defender), win pips, and outcome overlay.
- **Verification:** Playing through a full game shows correct UI for every state. Countdown bar depletes smoothly with green→amber→red shift. Key legend shows shuffled mappings during defend. Outcome overlay displays for 1.2s.
- **Test intent:** Verify every state has a distinct, correct visual representation. Verify countdown bar animation is smooth.

### Task 7 — Polish and edge cases
Add hit flash (CSS keyframe on losing avatar), visibilitychange pause/resume, and GAME_OVER restart flow.
- **Verification:** Hit flash fires on HIT outcome. Switching tabs pauses the countdown; returning resumes it. Pressing any key on GAME_OVER restarts to IDLE with scores reset.
- **Test intent:** Verify pause/resume doesn't corrupt state or timers. Verify restart clears all state cleanly.

## Dependency Ordering

```
Task 1 (HTML scaffold)
  └→ Task 2 (State machine)
       ├→ Task 3 (Input handling)  ─┐
       └→ Task 5 (Spell resolution) ├→ Task 6 (Rendering) → Task 7 (Polish)
            Task 4 (Key shuffling) ─┘
```

Tasks 3, 4, and 5 can be built in parallel after Task 2. Task 6 depends on all three. Task 7 is final.

## Edge Cases and Failure Modes

| Scenario | Handling |
|----------|----------|
| Both players press simultaneously | First `keydown` wins; state transition blocks the second |
| Key mashing during REVEAL_DELAY | No handler registered; all input dropped |
| Defender mashes before spell appears | Same — REVEAL_DELAY has no handler |
| Browser loses focus (tab switch) | `visibilitychange` pauses `activeTimer`, shows "PAUSED" overlay, resumes on return |
| Attacker timeout (no press in 3s) | FUMBLE — roles swap (same effect as CLASH) |
| Background tab timer throttling | Neutralised by visibilitychange pause — setTimeout is not running while backgrounded |
| Rapid state transitions | Single `activeTimer` handle always cleared before setting new one — no orphaned timers |

## Notes

- Output file: `mvp/index.html`
- No dependencies, no build step — open directly in browser
- setTimeout for state transitions, requestAnimationFrame for visual countdown updates
- Math.random() + Fisher-Yates for key shuffling (adequate for a local party game)

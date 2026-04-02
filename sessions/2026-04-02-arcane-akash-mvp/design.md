# Arcane Akash — MVP PoC

**Date:** 2026-04-02
**Skills:** ideate, blueprint, implement

## Problem
We need a playable proof-of-concept that validates the core duel loop — attack/defend alternation with countdown pressure and rock-paper-scissors counterplay — before investing in voice input, animations, and the full spell system. It must be demo-ready for a hackathon: single HTML file, zero dependencies, legible from 2 metres away.

## Decision
Informed defence with time pressure and key shuffling. The attacker picks a spell, it's revealed after a random delay, and the defender must counter under a variable timer — but with their key mappings randomly shuffled each defend phase. The defender always knows the *right answer* but must find it on a scrambled keyboard under pressure. This creates tension from spatial confusion + time pressure rather than from hidden information, and aligns with the full game's voice roadmap where the challenge comes from execution (speaking clearly under pressure), not from uncertainty.

### Why not the alternatives?
- **Blind Defence** — both players commit without seeing the other's choice. More strategic but contradicts the spec's reveal-then-defend flow and the voice version's design (defender responds to a known attack). Also less visually entertaining for spectators.
- **Brief Flash** — show the attack for 0.5s then hide it. Memory + time pressure is clever but adds timing fragility in vanilla JS and is hard to tune without playtesting.

---

## State Machine

```
IDLE → ATTACK_PHASE → REVEAL_DELAY → DEFEND_PHASE → RESOLVE → ROUND_END → loop
                                                                 ↓ (3 wins)
                                                               GAME_OVER → IDLE
```

### State Details

| State | Duration | Data | Player Action |
|-------|----------|------|---------------|
| IDLE | Until any key | `scores {p1, p2}` | Press any key to start |
| ATTACK_PHASE | 3s countdown | `attacker (1\|2)`, `countdown`, `timerId` | Attacker presses one of their 3 keys |
| REVEAL_DELAY | 200–600ms (random) | `attackSpell`, `delayMs`, `timerId` | None — input ignored |
| DEFEND_PHASE | 1.6–2.4s (random) | `attackSpell`, `shuffledKeyMap`, `countdown`, `timerId` | Defender presses one of their 3 keys (shuffled mappings) |
| RESOLVE | 1.2s display | `attackSpell`, `defendSpell\|null`, `outcome` | None |
| ROUND_END | 1.5s display | `outcome`, `scores`, `nextAttacker` | None |
| GAME_OVER | Until any key | `winner`, `scores` | Press any key to restart |

**Global state:** `currentState` string, `roundData` object, single `activeTimer` handle (always cleared on transition).

### Outcomes

| Scenario | Result | Next |
|----------|--------|------|
| Defender's spell beats attacker's | BLOCKED | Roles swap, continue |
| Attacker's spell beats defender's | HIT | Round over, attacker wins round |
| Same spell | CLASH | Roles swap, continue |
| Defender timeout | TIMEOUT | Round over, attacker wins round |
| Attacker timeout | FUMBLE | Roles swap (same as clash) |

## Spell System

Rock-paper-scissors triangle:

| Spell | Beats | Loses to |
|-------|-------|----------|
| Fireball | Hex | Shield |
| Shield | Fireball | Hex |
| Hex | Shield | Fireball |

**Key mappings (attack phase — fixed):**
- P1: `1` = Fireball, `2` = Shield, `3` = Hex
- P2: `8` = Fireball, `9` = Shield, `0` = Hex

**Key mappings (defend phase — shuffled):**
Each defend phase, the three spells are randomly assigned to the defender's three keys. The footer key legend updates to reflect the new mapping. Example: P2 defending might see `[8] Hex  [9] Fireball  [0] Shield` instead of the standard layout.

## Randomness Mechanics

Two sources of randomness per round, plus the key shuffle:

1. **Reveal delay** (200–600ms, uniform): Prevents the defender from reacting to the *sound* of the attacker's keypress. Defender's countdown does not start until the spell is revealed.
2. **Defend timer** (1.6–2.4s, uniform): Prevents rhythm-based muscle memory.
3. **Key shuffling**: Defender's spell-to-key mapping is randomised each defend phase. The correct counter is known, but finding the right key is a spatial puzzle under time pressure.

## Screen Layout

Single `<div id="game">` with four stacked regions:

```
┌─────────────────────────────────────────┐
│  ROUND 2       P1: ●●○    P2: ●○○      │  header (always visible, win pips)
├─────────────────────────────────────────┤
│                                         │
│   ⬡ PLAYER 1          ⬡ PLAYER 2       │  arena (avatar placeholders)
│    (attacker)          (defender)        │
│                                         │
│         >>>  FIREBALL!  >>>             │  spell banner (hidden during attack/reveal)
│                                         │
│        PLAYER 2 — DEFEND!               │  phase label
│           [ 1.8s ████████░ ]            │  countdown bar (CSS width transition)
│                                         │
├─────────────────────────────────────────┤
│  [8] Hex    [9] Fireball    [0] Shield  │  key legend (shuffled for defender)
└─────────────────────────────────────────┘
```

- Countdown bar driven by `requestAnimationFrame` for smooth depletion
- Win pips (filled/empty circles) are instantly readable from distance
- Key legend updates contextually: shows attacker's fixed mappings during attack phase, defender's shuffled mappings during defend phase
- RESOLVE state shows outcome overlay ("HIT!", "BLOCKED!", "CLASH!") for 1.2s

## Input Handling

Single `keydown` listener on `window`. Dispatch table keyed by `currentState`:

```
HANDLERS = {
  ATTACK_PHASE: handleAttack,
  DEFEND_PHASE: handleDefend,
  IDLE:         handleStart,
  GAME_OVER:    handleRestart,
}
```

All other states have no handler — keypresses are silently ignored. Each handler validates the key belongs to the active player's map before accepting. First valid `keydown` wins and transitions state, blocking subsequent presses.

## Failure Handling

| Scenario | Handling |
|----------|----------|
| Both players press simultaneously | First `keydown` wins; state transition blocks the second |
| Key mashing during REVEAL_DELAY | No handler registered; all input dropped |
| Browser loses focus | `visibilitychange` pauses `activeTimer`, shows "PAUSED" overlay, resumes on return |
| Attacker timeout | Roles swap (FUMBLE = same effect as CLASH) |

## Polish

- **Countdown colour shift:** Bar transitions green → amber → red via CSS custom properties updated each rAF tick
- **Hit flash:** On HIT, losing player's avatar div gets `flash-red` class (400ms CSS keyframe, `background: red → transparent`)

## What This Validates

- Does the attack/defend alternation with key shuffling create real tension?
- Is the variable timing (reveal delay + defend timer) enough to prevent mechanical play?
- Is the pacing right (too fast? too slow?) — adjust timer ranges based on playtesting
- Is the screen layout legible for spectators?

## What This Skips

- Voice input (next iteration)
- Volume mechanic
- Spell hijack / scramble (the key shuffle is a lightweight version of this concept)
- Animations beyond text transitions and colour flashes
- Art, theming, Akash branding
- Spell variety beyond 3

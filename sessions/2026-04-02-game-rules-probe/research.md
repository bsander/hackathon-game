# Research: Arcane Akash Game Rules

## Overview

Arcane Akash is a two-player, local, keyboard-based spell duel. Players share a screen and keyboard, taking turns attacking and defending with spells built on a rock-paper-scissors triangle plus a spell morphing disruption mechanic.

## Core Rules

### Victory Conditions

- **Game win:** First to **3 round wins** (`WIN_SCORE = 3` in `mvp/js/constants.js:8`)
- **Round win:** One successful **HIT** — attacker scores 1 point, round ends

### The Three Spells

| Spell | Beats | Loses to | Emoji |
|-------|-------|----------|-------|
| Fireball | Hex | Shield | 🔥 |
| Shield | Fireball | Hex | 🛡 |
| Hex | Shield | Fireball | 💀 |

Standard rock-paper-scissors cycle. Defined in `mvp/js/constants.js:1-3`.

### Resolution Outcomes

| Scenario | Outcome |
|----------|---------|
| Same spell | **CLASH** — roles swap, no score |
| Defender's spell beats attacker's | **BLOCKED** — roles swap, no score |
| Attacker's spell beats defender's | **HIT** — attacker scores, round ends |
| Defender times out | **HIT** — attacker scores, round ends |

Resolution logic: `mvp/js/resolution.js:7-37`.

## Turn Structure

### Phase Flow

```
IDLE → ATTACK_PHASE (3s) → REVEAL_DELAY (200-600ms) → DEFEND_PHASE (1.6-2.4s) → RESOLVE
```

After resolution:
- **HIT** → NEXT_ROUND (or GAME_OVER if score reaches 3)
- **BLOCKED / CLASH** → roles swap, back to ATTACK_PHASE
- **Fumble** (attacker timeout) → roles swap, no score

### Player Controls

| Player | Slot 1 | Slot 2 | Slot 3 |
|--------|--------|--------|--------|
| P1 | `1` (Fireball) | `2` (Shield) | `3` (Hex) |
| P2 | `8` (Fireball) | `9` (Shield) | `0` (Hex) |

Key mappings are fixed — only the spell contents of slots change via morphing.

## Spell Morphing (Disruption Mechanic)

The morphing system adds strategic depth beyond basic RPS. Each player's 3 slots can hold either a **Standard spell** or **Chaos**.

### Morph Triggers

1. **Cast a Standard spell** → that slot degrades to **Chaos** (`mvp/js/game.js:328-338`)
2. **Get hit** → one random Standard slot on the *opponent* degrades to Chaos (`mvp/js/game.js:340-350`)
3. **Cast a Chaos spell** → that slot restores to its original Standard spell (`mvp/js/game.js:331-337`)

### Chaos Resolution

When either spell in a duel is Chaos:
- Normal BEATS table is bypassed
- 50/50 random outcome: HIT or BLOCKED (no CLASH possible)
- Defined in `mvp/js/resolution.js:11-14`

### Round Reset

All slots reset to `['Fireball', 'Shield', 'Hex']` at the start of each new round — Chaos does not carry over (`mvp/js/game.js:364-365`).

## Special Mechanics

- **Random starter:** Each round randomly picks the initial attacker
- **Variable defend timer:** 1600-2400ms to add uncertainty (`mvp/js/game.js:248`)
- **Tab pause/resume:** Game pauses when the browser tab loses focus (`mvp/js/game.js:417-448`)

## Test Coverage

All rules are validated by vitest tests:
- Resolution: all 9 standard combinations + Chaos + timeout (`mvp/test/resolution.test.js`)
- BEATS cycle validity (`mvp/test/constants.test.js`)
- Slot defaults and Chaos distinction (`mvp/test/slots.test.js`)
- Utility functions (`mvp/test/utils.test.js`)

## Key Files

| Aspect | File |
|--------|------|
| Spell definitions & BEATS | `mvp/js/constants.js` |
| Game state machine | `mvp/js/game.js` |
| Resolution logic | `mvp/js/resolution.js` |
| Design spec | `ideas/game-spec.md` |
| MVP spec | `ideas/mvp-spec.md` |
| Morphing design | `sessions/2026-04-02-disruption-mechanics/design.md` |

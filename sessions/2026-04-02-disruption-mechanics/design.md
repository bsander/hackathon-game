# Arcane Akash — Disruption Mechanics (Spell Morphing)

**Date:** 2026-04-02
**Skills:** ideate, blueprint, implement

## Problem
The existing MVP is a functional RPS duel but lacks the "I can't believe you just did that" feeling the team wants. The game needs UNO-style disruption — mechanics where the fun comes from messing with your opponent, not from reaction speed or complex inputs. The team confirmed: keyboard-first, shared keyboard, strict turn alternation, accessible to non-gamers.

## Decision
**Spell Morphing with a two-tier system (Standard + Chaos).** Every spell you cast degrades that slot toward a generic "Chaos" state. Getting hit also degrades a random slot. Chaos spells have random outcomes but reset their slot to Standard when cast. This creates UNO-like mounting pressure without UI corruption or cognitive fog — everything is always visible and readable.

### Why not the alternatives?
- **Curse Stacking with UI corruption** (scrambled labels, input delays, timer shrinks) — confuses non-gamers at a demo. Multiple stacked effects create "I didn't know what happened" moments. Frustration, not fun.
- **Spell Effects as separate Disrupt action** — adds a 4th spell type and a two-step cast (pick Disrupt, then pick effect). More complex input for marginal gain over morphing, which is automatic.
- **Shared-Key Chaos** (both players grab same keys) — high physical comedy but impossible to distinguish inputs. Ambiguity kills the turn structure the team confirmed as essential.

---

## Spell System

### Two Tiers

| Tier | Slot 1 | Slot 2 | Slot 3 | Behaviour |
|------|--------|--------|--------|-----------|
| Standard | Fireball | Shield | Hex | Normal RPS triangle. Fireball > Hex > Shield > Fireball. |
| Chaos | Chaos | Chaos | Chaos | Random outcome on resolution. Casting resets that slot to its original Standard spell. |

Each slot degrades independently. A player can have e.g. `[Fireball] [Chaos] [Hex]`.

### Morph Rules

1. **Cast a Standard spell:** that slot degrades to Chaos.
2. **Get hit:** one random Standard slot degrades to Chaos. (If all slots are already Chaos, no additional penalty.)
3. **Cast Chaos:** random resolution (50/50 win/lose against opponent's spell, ignoring RPS). That slot **resets to its original Standard spell** (Fireball/Shield/Hex based on position).
4. **Defend with Chaos:** same random resolution + reset.

### Key Mappings (fixed, never shuffled)

- P1: `1` = Slot 1, `2` = Slot 2, `3` = Slot 3
- P2: `8` = Slot 1, `9` = Slot 2, `0` = Slot 3

Slots always map to the same key. Only the spell *in* the slot changes.

## Turn Flow

```
ATTACK_PHASE → DEFEND_PHASE → RESOLVE → MORPH → ROUND_END/SWAP
```

1. **ATTACK_PHASE** (3s countdown): Attacker presses one of their 3 keys. Screen shows which spell they hold in that slot.
2. **DEFEND_PHASE** (1.6–2.4s countdown, variable): Defender presses one of their 3 keys.
3. **RESOLVE** (1.2s): RPS outcome — HIT, BLOCKED, or CLASH. If either spell was Chaos, resolve randomly (50/50).
4. **MORPH** (0.8s): Degradation animations play. Attacker's used slot degrades (Standard → Chaos). If defender was hit, one of defender's Standard slots also degrades. If a Chaos spell was cast, that slot resets to Standard with ↑ animation.
5. **Roles swap** (on BLOCKED/CLASH) or **ROUND_END** (on HIT).

### Win Condition
- One HIT = round over (attacker wins the round)
- First to 3 rounds = game over

## Feedback & Discoverability

### Morph Feedback (Blocker 1 — addressed)
When a slot morphs, a brief cause label flashes on the slot for 0.6s before settling:
- `"CAST → CHAOS"` — you used this spell, it degraded
- `"HIT → CHAOS"` — you got hit, this slot degraded
- `"CAST → RESTORED!"` — you cast Chaos, slot reset to Standard

This ensures players always know *why* their spells changed.

### Wild Reset Discoverability (Blocker 2 — addressed)
When a Chaos slot resets to Standard:
- The slot flashes green with a ↑ indicator
- A brief "RESTORED!" label appears
- Distinct from the downward red flash of degradation

This makes the reset mechanic visually obvious — players learn that Chaos is an escape valve, not just a penalty.

### Phase Banners
Large text banners for each phase:
- `"P1 — ATTACK!"` / `"P2 — DEFEND! [2.1s]"`
- During MORPH: `"SPELLS SHIFTING..."` with per-slot animations
- On resolution: `"HIT!"` / `"BLOCKED!"` / `"CLASH!"` (carried from MVP)

## Screen Layout

```
┌──────────────────────────────────────────────┐
│  ROUND 2         P1: ●●○      P2: ●○○       │
├──────────────────────────────────────────────┤
│                                              │
│  P1 SPELLS:                P2 SPELLS:        │
│  [1] Fireball 🔥           [8] CHAOS 🌀     │
│  [2] CHAOS 🌀              [9] Shield 🛡     │
│  [3] Hex 💀                [0] Hex 💀        │
│                                              │
│          >>> P1 — ATTACK! <<<                │
│            [ 2.1s ████████░ ]                │
│                                              │
│  [1] Fireball: beats Hex, loses to Shield    │
├──────────────────────────────────────────────┤
│  🌀 = Chaos (random outcome, resets on cast) │
└──────────────────────────────────────────────┘
```

## Failure Modes

| Failure | Likelihood | Mitigation |
|---|---|---|
| All 3 slots degrade to Chaos simultaneously — player feels helpless | Medium | Chaos resets on cast, so casting any Chaos spell starts recovery. Worst case = 1 turn of full Chaos before a slot restores. |
| 50/50 random feels unfair when it decides a round | Medium | Chaos is a known risk. Both players can see when the opponent is forced into Chaos. The randomness IS the UNO moment — "will it work?" |
| Players avoid casting to prevent degradation (turtling) | Low | Attacker MUST cast within 3s or fumble (roles swap). You can't avoid degradation — only choose which slot to sacrifice. |
| Demo host has to explain too much | Low | Bottom bar permanently shows `🌀 = Chaos (random, resets on cast)`. Phase banners + morph labels self-explain. |

## Incremental Build Path

Each step produces a playable, demoable game:

1. **Current MVP** — RPS with attack/defend turns. Already works.
2. **Add Chaos tier** — casting degrades your slot to Chaos. Chaos resolves randomly. Display Chaos in the spell UI. (~1 hour)
3. **Add morph-on-hit** — getting hit degrades a random opponent slot. (~30 min)
4. **Add Chaos reset** — casting Chaos resets the slot + ↑ animation. (~30 min)
5. **Add morph feedback labels** — cause-attributed flash labels on degradation/reset. (~30 min)
6. **Polish** — morph animations, emoji, sound cues, spectator-friendly sizing. (~1 hour)

Total estimate: ~3.5 hours on top of existing MVP.

## What This Skips
- Voice input (future layer)
- Key shuffling from original MVP design (replaced by spell morphing as the complexity source)
- Weakened tier (cut for simplicity — can add back if morphing feels too binary)
- Environmental/random key effects (interesting future direction, not for today)
- Art assets beyond emoji

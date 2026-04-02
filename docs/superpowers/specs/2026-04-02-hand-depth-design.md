# Arcane Akash — Hand Depth Design

**Date:** 2026-04-02
**Status:** Approved

## Problem

The current MVP turn loop is too linear: every turn is structurally identical (attack → defend → resolve → swap), all 3 spells are always available, and no decisions carry weight beyond the current exchange. There is no strategic arc within a game.

## Decision

Add a **depleting hand of 5 spell cards per player**, redealt randomly each round. Players can only cast spells they hold. When a player's hand empties on their turn, they automatically take a hit.

---

## Hand System

### Deck & Deal

- Each player has their own independent deck of 15 cards: 5× Fireball, 5× Shield, 5× Hex
- At the start of each round, each player's deck is shuffled and the top 5 cards are dealt as their hand
- Because each player draws from their own full deck independently, hands are asymmetric by chance: one player might receive [Fireball×3, Shield×1, Hex×1] while the other gets [Fireball×1, Shield×2, Hex×2]
- Extreme distributions (e.g. 5× Fireball, 0 others) are possible but rare (~0.4% per deal)

### Spending Cards

- Every spell play (attack or defend) consumes one card of that type from the player's hand
- Consumed cards are gone for the remainder of the round
- A fresh hand is dealt at the start of each new round

### Empty Hand Rule

- If a player's turn begins (attack or defend phase) and they have **zero cards remaining**, they take an automatic hit
- This is a new outcome: `EMPTY_HAND_HIT`
- A player cannot stall — the empty-hand check fires immediately when the phase starts

---

## Visibility

Both players' hands are **publicly visible** throughout the round — type and remaining count, not individual card identities (which are equivalent within a type).

Display format (side panels flanking the arena):

```
P1 HAND (3 left)          P2 HAND (4 left)
🔥×2  🛡️×1  💀×0         🔥×1  🛡️×2  💀×1
```

Depleted spell types are shown dimmed/struck so the depletion state is readable at a glance from 2 metres.

---

## Key Legend Changes

- During **attack phase**: the active player's key legend only shows spell types they still hold. Keys for depleted spells are visually disabled and do not register input.
- During **defend phase**: the shuffled key mapping only shuffles across spell types the defender still holds. If only one type remains, there is nothing to shuffle — the defender's single remaining type maps to all their keys, and the opponent knows exactly what's coming.

---

## State Machine Changes

One new transition added to the existing machine:

```
ATTACK_PHASE → [empty hand check] → RESOLVE (EMPTY_HAND_HIT)
DEFEND_PHASE → [empty hand check] → RESOLVE (EMPTY_HAND_HIT)
ROUND_END    → [deal fresh hands] → ATTACK_PHASE (next round)
```

All other transitions unchanged.

### Updated Outcomes

| Scenario | Result | Next |
|----------|--------|------|
| Defender's spell beats attacker's | BLOCKED | Roles swap, continue |
| Attacker's spell beats defender's | HIT | Round over, attacker wins round |
| Same spell | CLASH | Roles swap, continue |
| Defender timeout | TIMEOUT | Round over, attacker wins round |
| Attacker timeout | FUMBLE | Roles swap |
| Active player has 0 cards on turn start | EMPTY_HAND_HIT | Round over, other player wins round |

---

## Screen Layout

Side panels added to the arena region, flanking the avatars:

```
┌─────────────────────────────────────────────────────┐
│  ROUND 2          P1: ●●○          P2: ●○○          │
├──────────┬──────────────────────────┬───────────────┤
│ P1 HAND  │                          │ P2 HAND       │
│ 🔥×2     │  ⬡ PLAYER 1  ⬡ PLAYER 2 │ 🔥×1          │
│ 🛡️×1     │                          │ 🛡️×2          │
│ 💀×0 dim │   >>> FIREBALL! >>>      │ 💀×1          │
│          │                          │               │
│          │  PLAYER 2 — DEFEND!      │               │
│          │  [ 1.8s ████████░ ]      │               │
├──────────┴──────────────────────────┴───────────────┤
│  [8] Hex    [9] Fireball    [0] Shield               │
└─────────────────────────────────────────────────────┘
```

---

## Strategic Texture

- **Early rounds**: both players have full hands, play feels similar to current MVP
- **Mid-round**: as cards deplete, players must decide whether to spend a rare type on attack or save it for defence
- **End-game within a round**: a player down to 1 spell type cannot shuffle — their remaining move is known. The opponent can exploit this; the depleted player must decide whether to burn their last cards or let the timer run
- **Cross-round asymmetry**: each round's random deal means skill is in adapting to a new hand composition, not memorising a fixed strategy

---

## What This Skips

- No wildcard or special action cards (kept for a future iteration)
- No hand trading or stealing
- No mid-round drawing

---

## What This Validates

- Does hand depletion create meaningful decisions within a round?
- Is the side panel hand display readable from 2 metres?
- Does random asymmetric dealing feel fair or frustrating?
- Does the empty-hand auto-hit feel punishing or just?

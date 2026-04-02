# Cauldron Tug-of-War

**Date:** 2026-04-02
**Skills:** ideate

## Problem
The existing Arcane Akash game has a rock-paper-scissors core loop that feels flat despite visual polish and a morphing mechanic layered on top. The fundamental issue isn't the RPS triangle itself but the lack of directed player-to-player interaction: every consequence is a side-effect of the triangle resolving, and no player ever aims anything at the other person. The team wants UNO-style social energy — screaming, bashing, yelling — which requires players to feel like they're acting *on each other*, not *against an abstraction*.

## Decision
Build a **completely new game** (in `mvp3-final-dog/`, separate from the existing Arcane Akash) with a fundamentally different core loop: a real-time shared cauldron where both players simultaneously press ingredient keys to feed a volatile shared object. The cauldron has two axes — **pressure** (how soon it explodes) and **direction** (who it's aimed at) — and every ingredient trades one axis for the other. Cross-player ingredient interactions within an 800ms window create the "reacting to your opponent" dynamic the team wanted.

### Why not the alternatives?
- **Targeted Hex (disruption bolted onto RPS)** — still RPS at its core. Adding a hex action between RPS turns doesn't change the fundamental decision structure; it decorates it with a side-action.
- **Spell Theft / Combo Chains on existing game** — incremental additions to a loop that's already been identified as flat. Smoother gameplay on a boring core is still boring.
- **Bluff and Challenge** — hidden information is hard on a shared screen. Solvable with "look away" rituals but physically awkward for a hackathon demo.
- **Draft and Duel** — the drafting phase is interesting but the duel phase is still RPS. Moves the fun to before the fight rather than into it.

---

## Core Loop

Both players press ingredient keys **simultaneously in real-time**. Each press adds to a shared cauldron with two visible axes:

- **Pressure** (0 → 30): fills toward explosion. At threshold → BOOM.
- **Direction** (-10 to +10): a tug-of-war bar. Negative = aimed at P1, positive = aimed at P2. Whoever the bar points at when it explodes takes 1 pip of damage.

**Round duration:** ~8-12 seconds of frantic play. First to lose 3 pips loses.

```
3-2-1 COUNTDOWN → CAULDRON ACTIVE (8-12s) → EXPLOSION → pip loss → pause (2s) → next round
```

Direction and Brew charges reset each round. Health carries over.

## Ingredients

4 ingredients per player, 4 keys each. P1: `1 2 3 4`, P2: `7 8 9 0`.

| Ingredient | Pressure | Direction | Role |
|---|---|---|---|
| **Fireball** 🔥 | +3 | +3 toward opponent | Aggressive — aims explosion but brings it closer |
| **Shield** 🛡 | -1 (removes) | 0 | Defensive — buys time, doesn't help direction |
| **Hex** 💀 | +2 | Reverses direction (±1 random) | Comeback — great when losing, catastrophic when winning |
| **Brew** ✨ | +1 | 0 (charges next press: 2× direction) | Investment — telegraphed but powerful setup |

### Trade-off Design

Every ingredient has a genuine reason to exist in specific game states:

- **Fireball**: when you need direction NOW and can afford the pressure spike
- **Shield**: when pressure is dangerously high and survival matters more than direction. Also the primary **counter to Fireball** (see reactions below)
- **Hex**: when direction is against you and you need a reversal. The ±1 random variance adds unpredictability — you can't perfectly calculate the swing
- **Brew**: when you have a direction lead and want to set up a devastating next move. Visible to opponent (your side glows), creating read/counter-read tension

## Cross-Player Reactions

When both players press within **800ms** of each other, their ingredients interact:

| Your press | After their... | Interaction |
|---|---|---|
| Shield 🛡 | Fireball 🔥 | **Counter** — Fireball's direction is negated. Net: +2 pressure, 0 direction |
| Fireball 🔥 | Fireball 🔥 | **Clash** — Directions cancel. Net: +6 pressure, 0 direction. Mutual escalation |
| Hex 💀 | Fireball 🔥 | **Deflect** — Fireball's direction reverses at caster. Net: +5 pressure, direction toward Fireball player |
| Shield 🛡 | Shield 🛡 | **Stall** — Net: -2 pressure, 0 direction. Both buy time |
| Hex 💀 | Hex 💀 | **Chaos** — Direction becomes random. Net: +4 pressure, random direction |
| Brew ✨ | Brew ✨ | **Cancel** — Both brews fizzle, neither gets charge |

Non-listed combinations apply base effects normally.

### Reaction Design Principle

Shield is the **Fireball counter** — playing Shield right after an opponent's Fireball absorbs their direction push. This creates the "reading your opponent" dynamic: Fireball spam is punished by attentive Shield play, but Shield-only play concedes direction entirely.

## Brew Chain (Build-Up Mechanic)

Brew charges are **visible** (player's side glows with increasing intensity).

| Brew stacks | Next ingredient direction multiplier |
|---|---|
| 1 | 2× |
| 2 | 3× |

A double-Brewed Fireball pushes +9 direction — nearly the entire bar. But the opponent can see the charge building and:
- Rush pressure with Fireballs to force early explosion
- Prepare a Shield to counter the charged Fireball
- Brew themselves to match

Brew stacks reset on non-Brew press (consumed) or on round end.

## Timing

- **Player cooldown:** 500ms between presses (per player). ~2 presses/second.
- **Reaction window:** 800ms. If both players press within this window, the interaction table applies.
- **Round countdown:** 3-2-1 visual countdown before inputs go live.
- **Pressure threshold:** ~30. At ~4-6 combined pressure per second, rounds last 8-12 seconds.

## Visual Design

```
┌──────────────────────────────────────────────┐
│  P1: ♥♥♥          ROUND 2          P2: ♥♥♡  │
├──────────────────────────────────────────────┤
│                                              │
│  [1] Fireball 🔥              [7] Fireball 🔥│
│  [2] Shield 🛡                [8] Shield 🛡  │
│  [3] Hex 💀                   [9] Hex 💀     │
│  [4] Brew ✨                  [0] Brew ✨     │
│                                              │
│         ◄◄◄◄◄██████►►►                  │
│         P1    DIRECTION    P2                │
│                                              │
│              🔥 PRESSURE 🔥                  │
│           ████████████████░░░░░░             │
│                                              │
│         [ cauldron bubbling visual ]         │
│                                              │
├──────────────────────────────────────────────┤
│ 🛡 counters 🔥 • 💀 reverses direction       │
│ ✨ charges next press • 💀💀 = chaos!        │
└──────────────────────────────────────────────┘
```

- **Direction bar** is the centrepiece — slides left/right in real-time, colour-coded (red=P1 danger, blue=P2 danger)
- **Pressure bar** fills up — cauldron bubbles more violently, screen shakes at 80%+
- **Hex reversal** gets a distinct snap animation on the direction bar
- **Brew charge** makes the player's side glow (1 stack = faint, 2 stacks = bright)
- **Cross-player reactions** flash a brief label: "COUNTERED!", "CLASH!", "DEFLECTED!", "CHAOS!"
- **Explosion** is theatrical — directed blast toward the losing player, pip shatters

## Spectator Legibility

A viewer understands the game in one glance: "two people are fighting over which way a bomb explodes." The direction bar tells the story continuously. The pressure bar shows how close the explosion is. Everything else is detail that rewards attention but isn't required.

## Failure Modes

| Failure | Likelihood | Mitigation |
|---|---|---|
| Shield spam stalls the game (both players reduce pressure) | Medium | Shield only removes 1 pressure; any other ingredient adds 1-3. Two Shield presses (-2) are overwhelmed by one Fireball (+3). Pure stalling loses to any aggression. |
| Hex feels random / uncontrollable | Medium | ±1 random variance is small relative to the ±reversal. The randomness adds spice without making it feel arbitrary. Hex's high pressure cost (+2) is the real risk, not the randomness. |
| Brew is never used (too slow for frantic play) | Medium | A Brewed Fireball at 2× direction (+6) is twice as effective. Players who discover this dominate players who don't. The visible glow creates social moments ("they're charging!"). |
| 800ms reaction window feels too fast to read opponent | Medium | Players don't need to consciously "react" — they're pressing continuously. The interaction system rewards natural timing, not deliberate reaction. |
| Rounds feel same-y | Low | Short rounds (8-12s), different starting aggression, Hex swings, and Brew build-ups create varied arcs within the simple structure. |
| 4 keys per player is too many to remember | Low | Keys are labelled on screen. Ingredient effects are intuitive (fire = aggressive, shield = defensive). Players naturally start with Fireball and discover others. |

## Scope

One HTML + one JS + one CSS file in `mvp3-final-dog/`. No external dependencies. No server.

Core implementation:
- Key state tracking: `keydown` handler, per-player cooldown timestamp, last-key + timestamp for reaction detection
- Game state: `pressure` (number), `direction` (number), `health` (2 ints), `brewStacks` (2 ints), `roundActive` (bool)
- Render loop: `requestAnimationFrame` for bar animations and cauldron visuals
- Explosion: CSS animation + state reset
- Reaction detection: compare last-press timestamps between players, apply interaction table if within 800ms

Simpler state machine than the existing Arcane Akash — no attack/defend phases, no morph states, no backfire tracking. One continuous real-time phase per round.

## What This Skips
- Sound effects (would enhance but not required for first playtest)
- Particle effects on cauldron (CSS animations are sufficient)
- More than 4 ingredients (can expand if the base game works)
- Tournament mode / best-of-N configuration
- Mobile / touch input

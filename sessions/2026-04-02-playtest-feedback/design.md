# Arcane Akash — Playtest Feedback Response

**Date:** 2026-04-02
**Skills:** ideate, blueprint, implement

## Problem
Two playtesters found the MVP confusing and unengaging despite functional mechanics. Five core issues surfaced: turn ownership is illegible, button mashing dominates over deliberation, chaos/morph effects are invisible, health feels flat, and there's no on-screen guidance. The underlying cause is feedback failure — the morph system, turn structure, and spell choices already create the right dynamics, but they're invisible to players.

## Decision
Visual clarity overhaul + backfire self-damage + extended morph visibility. Make the existing mechanics legible rather than adding new ones. The morph system already provides strategic depth (choose which slot to sacrifice); making it impossible to miss should naturally encourage deliberation. Backfire punishes persistent mashing with self-damage (lose 1 pip), providing a mechanical backstop. Space bar to start gives players a moment to orient.

### Why not the alternatives?
- **Hold-to-commit (charge mechanic)** — physically broken on a shared keyboard. No `keyup` listener exists, phantom cancellations from the other player grazing keys would feel like bugs. Defender's 1.6–2.4s window is too short for meaningful charging.
- **Misfire jamming (lock slots on out-of-turn press)** — punishes disorientation rather than mashing. Players who can't tell whose turn it is get penalised for confusion, not for bad play. Visual clarity should fix orientation first.
- **Progressive HP (10 HP)** — makes each hit *less* dramatic for spectators. Losing 3 of 10 is visually smaller than losing 1 of 3 pips. The playtest complaint about flat health is about legibility, not granularity.
- **Simplified flow (one action per turn)** — eliminates the attack/defend tension the game is built around. Effectively a different game.

---

## Visual Turn Ownership

Active player's column gets a bright glow border: **orange** for attacker, **blue** for defender. Inactive player's column dims to **40% opacity**. This replaces prose-based role communication with spatial/colour signalling readable from across the room.

Phase banner becomes visual shorthand: active player's name + emoji role icon, colour-coded. No duplicate prose — the instruction bar handles text guidance.

## Consolidated Instruction Bar

One guidance layer at the bottom of the screen. Context-sensitive text that changes per state:

| State | Instruction bar |
|-------|----------------|
| IDLE | "Press SPACE to begin the duel" |
| ATTACK_PHASE | "P1: Cast → [1] Fireball 🔥  [2] CHAOS ❓  [3] Hex 💀" |
| DEFEND_PHASE | "P2: Counter FIREBALL → [8] Shield 🛡  [9] Hex 💀  [0] CHAOS ❓" |
| RESOLVE/MORPH | *(empty or "Watch your spells...")* |
| GAME_OVER | "Press SPACE to play again" |

Key details:
- Shows actual slot contents (reflects Chaos state)
- Defend bar names the attack being countered
- No separate phase banner text competing for attention

## Permanent RPS Legend

Always visible in a corner: `🔥 > 💀 > 🛡 > 🔥` with `🌀 = random outcome, resets on cast`. No dismissible splash. Players glance at it any time during play.

## Backfire Self-Damage (Anti-Mashing)

When a player presses one of **their own keys** during the **opponent's phase**:

1. **First press per phase**: warning spark on their avatar + `Careful!` flash on their column. No damage.
2. **Any subsequent press in the same phase**: `BACKFIRE!` explosion animation on their avatar + **lose 1 pip**. Their column flashes red.

The counter resets each time a new phase starts. This means:
- One accidental press is forgiven (teachable moment)
- Persistent mashing costs you the match
- The self-damage is visible in the pip display and as a dramatic animation
- Spectators can see (and laugh at) someone hurting themselves

Implementation: track `misfireCount[player]` per phase. Reset to 0 on every `enterState()` call. In the keydown handler, when a key belongs to the inactive player, increment their misfire count. If count > 1, trigger backfire.

## Extended Morph Phase

Morph animations extended from **0.6s to 1.5s** and **block the state transition** — the next attack phase doesn't start until morphing completes.

During morph:
- `SPELLS SHIFTING...` banner in the centre
- Each morphing slot shows a large, distinct animation:
  - **Degradation**: red downward pulse, label `CAST → CHAOS` or `HIT → CHAOS`
  - **Restoration**: green upward pulse, label `RESTORED!`
- Both players' spell panels are fully visible (no overlay covering them)

This is the primary anti-mashing lever: when players can see their slots degrading and restoring every turn, they start choosing which slots to sacrifice deliberately.

## Commitment Ceremony

When a valid keypress is accepted:
- 0.3s `✦ LOCKED IN` flash on the **active player's column**
- The selected spell slot pulses gold briefly
- All subsequent keypresses in that phase are ignored (already works mechanically; now visible)
- For the defender specifically: a subtle confirmation tick rather than a celebration

## Soft Fizzle for Wrong-Player Keys

If you press keys that belong to the **other player** (e.g., P1 presses `8`): brief `Not your turn!` text on your column. No penalty — this is orientation confusion, not mashing. The dim column + instruction bar should make this rare.

Note: this is distinct from the backfire mechanic, which triggers on YOUR keys during the opponent's phase. Wrong-player keys are always harmless.

## Score Model: Health Pips (Inverted)

The current model counts wins upward (0 → 3). Backfire requires pips that can be *removed*. Invert to a health model: each player starts with 3 health pips, losing pips on HIT, TIMEOUT, or BACKFIRE. GAME_OVER when health reaches 0. `WIN_SCORE` becomes `START_HEALTH`. Visually identical to the current behaviour from the player's perspective — the only difference is the semantic direction.

## Keep 3 Pips, Localised Hit Effects

Keep the 3-pip health system. Make pip loss theatrical:
- Losing player's column flashes red
- The lost pip shatters with a brief burst animation
- No screen shake (shared screen means it would disorient the winner too)
- Winner's side stays stable

## Space Bar to Start

IDLE and GAME_OVER states require **space bar** specifically (not any key). The screen clearly shows `Press SPACE to begin the duel` / `Press SPACE to play again`. This gives new players a moment to read the screen and orient before the duel begins, instead of accidentally starting by pressing random keys.

## State Machine Changes

```
IDLE → (space) → ATTACK_PHASE → REVEAL_DELAY → DEFEND_PHASE → RESOLVE → MORPH_DISPLAY → ATTACK_PHASE
                                                                          ↓ (3 wins)
                                                                        GAME_OVER → (space) → IDLE
```

New state: `MORPH_DISPLAY` (1.5s) — dedicated phase for morph animations to complete before the next attack begins. Input is ignored during this state.

## Failure Modes

| Failure | Likelihood | Mitigation |
|---|---|---|
| Players still mash despite visible morph | Medium | Backfire self-damage provides mechanical backstop. If still insufficient, add input cooldown (300ms unresponsive after any press) in next iteration. |
| Backfire feels unfair to confused players | Low | First press per phase is free (warning only). Visual clarity should make turns obvious after 1-2 rounds. |
| Morph blocking (1.5s) makes pacing too slow | Medium | Can tune down to 1.0s. The current 0.6s was too fast; 1.5s is the starting point for playtesting. |
| RPS legend takes up screen space | Low | Compact one-line format. Can hide after first game if needed. |
| Space bar conflates with other apps (accessibility) | Low | Space is universally understood. Only used for IDLE/GAME_OVER, not during gameplay. |

## What This Skips
- Voice input (future layer)
- Progressive HP / variable damage (rejected — 3 pips is more dramatic)
- Hold-to-commit / charge mechanic (rejected — broken on shared keyboard)
- Misfire jamming / slot locking (rejected — punishes confusion not mashing)
- Key shuffling (already replaced by spell morphing in previous iteration)
- Sound effects (would enhance but not strictly necessary for playtest)

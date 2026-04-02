# Cauldron Clarity & Balance

**Date:** 2026-04-02
**Skills:** ideate, blueprint, implement

## Problem
Playtest feedback on Cauldron Tug-of-War reveals two linked issues: (1) spell effects and strategic options are mechanically present but perceptually invisible — players take ~7 rounds to understand basic logic, and (2) Fireball spam dominates because Fireball is the strongest on both pressure and direction axes with no tempo cost, leaving no reason to use other spells until players discover the counter system organically.

## Decision
Improve clarity through an onboarding screen and per-press visual feedback, and rebalance Fireball via a longer per-ingredient cooldown (1200ms vs 500ms for other spells). Keep the real-time simultaneous-play core — the learning problem is caused by invisible consequences, not by the real-time format itself. No new game states; all changes are rendering additions and a single cooldown constant.

### Why not the alternatives?
- **Tutorial round** — can't demonstrate the cross-player reaction system (needs two humans), adds an unmaintained parallel code path, and is dead time for hackathon spectators.
- **Turn-based switch** — loses the simultaneous-play energy that motivated the cauldron redesign. The prior game was turn-based RPS and felt flat; returning to turns risks the same outcome.
- **Flat Fireball stat nerf (direction +3→+2)** — addresses the symptom but not the structure. The problem is tempo: Fireball at 500ms cooldown means you can spam it as fast as any other spell. A per-cast nerf makes each Fireball weaker but doesn't change the spamming incentive.

---

## Pillar 1: Onboarding Screen

Replace the current IDLE overlay (`'CAULDRON TUG-OF-WAR' / 'Press any key to start'`) with a how-to-play screen:

- **One-sentence concept:** "Both players throw ingredients into the cauldron. When pressure maxes out, it explodes — the direction bar decides who takes damage."
- **Ingredient descriptions** in plain language:
  - 🔥 Fireball — big push toward opponent, builds pressure fast (slow to recharge)
  - 🛡 Shield — reduces pressure, no direction effect
  - 💀 Hex — reverses the direction bar (risky — adds pressure)
  - ✨ Brew — charges your next spell for double direction push
- **Key mappings** for both players
- **Start prompt:** "Press SPACE to start" (prevents accidental starts while reading)

Implementation: richer HTML content in the existing `$overlay` element. No new DOM structure or state machine states.

## Pillar 2: Per-Press Visual Feedback

Every keypress produces immediate, visible consequences so players learn through play:

### Floating delta labels
On each ingredient press, a short-lived label appears near the cauldron showing the effect:
- "+3 pressure" / "+2 direction →" for Fireball
- "-1 pressure" for Shield
- "direction reversed!" for Hex
- "+1 brew charge" for Brew

Labels fade after ~800ms. Implemented as temporary DOM elements appended to `#centre`, removed after CSS animation completes. One active label per player max to avoid clutter.

### Enhanced reaction labels
The existing `showReaction()` function already displays "COUNTERED!" etc. Extend with a brief explanation:
- "COUNTERED! — direction negated"
- "DEFLECTED! — fireball reversed at caster"
- "CLASH! — directions cancel, +6 pressure"
- "STALL! — pressure reduced"
- "CHAOS! — direction randomised"
- "CANCELLED! — brew stacks reset"

Same `#reaction-label` DOM element, just more descriptive text.

### Direction danger colouring
When direction reaches ±7 or beyond, the losing player's health pips pulse red. CSS animation on `.pip` elements based on a `danger` class toggled during `renderDirection()`.

### Cooldown dimming
During a player's cooldown period, their key rows dim (opacity: 0.4). For Fireball specifically (1200ms cooldown), the Fireball key row stays dimmed longer than the others, visually communicating the tempo cost. CSS transition on `.key-row`.

### First-round hint banner
During round 1 only, a thin banner below the cauldron reads: "TIP: 🛡 right after their 🔥 counters it!" — removed after round 1. Teaches the most important reaction contextually.

## Pillar 3: Fireball Cooldown Rebalance

**Current:** All ingredients share a 500ms global cooldown (`COOLDOWN_MS`).

**Change:** Fireball gets a 1200ms cooldown. All other ingredients stay at 500ms.

**Effect:**
- Fireball at ~0.8 casts/second vs others at ~2 casts/second
- Spamming only Fireball means half as many actions per round
- Mixed play (Fireball, then quick Shield/Hex while waiting) becomes the natural strategy
- Fireball's per-cast power is unchanged — still feels punchy when you use it

**Implementation:** Add `FIREBALL_COOLDOWN_MS = 1200` to constants.js. In the keypress handler, use the ingredient-specific cooldown when setting `cooldownUntil[player]`:

```js
const cd = ingredient === 'fireball' ? FIREBALL_COOLDOWN_MS : COOLDOWN_MS;
cooldownUntil[player] = now + cd;
```

One new constant, one conditional in the existing handler. No structural changes.

## Failure Modes

| Failure | Likelihood | Mitigation |
|---|---|---|
| Players skip/ignore onboarding screen | Medium | Per-press floating numbers teach through play regardless. Onboarding is a bonus, not a prerequisite. |
| Floating delta labels create visual noise | Medium | Limit to one active per player, small font, fast fade (800ms). Tune size/duration during testing. |
| 1200ms Fireball cooldown feels sluggish | Low | Still faster than 1/second. The key dimming provides visual feedback that the cooldown is intentional, not a bug. Easy to tune the constant. |
| Players still don't discover reactions | Medium | First-round hint banner addresses the Shield-counters-Fireball reaction. Enhanced reaction labels explain others when they fire organically. |
| Direction danger colouring is confusing | Low | Only activates at ±7 (extreme positions). Red pulsing is a universal "danger" signal. |

## Scope

All changes are in `mvp3-final-dog/`. No new files — modifications to:
- `js/constants.js` — add `FIREBALL_COOLDOWN_MS`
- `js/game.js` — onboarding overlay content, floating labels, enhanced reaction text, cooldown dimming, danger colouring, hint banner, per-ingredient cooldown logic
- `index.html` — minor: add SPACE key start instruction, hint banner element
- `style.css` — floating label animation, cooldown dim, danger pulse, hint banner styling

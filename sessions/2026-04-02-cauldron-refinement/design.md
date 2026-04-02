# Design: Cauldron Refinement — Mechanics Simplification & UI Cleanup

**Skills:** ideate, blueprint, implement

## Problem

Current Cauldron game (post-randomized-keys) has three issues:
1. **Direction bar is redundant** — both fill bar and arrow convey direction. Arrow alone is sufficient.
2. **Limited key pool** — only 20 keys (0-9, q-g) means less randomization entropy and smaller pool for larger player counts.
3. **Countering mechanics add complexity without clarity** — six reactions (counter, clash, deflect, stall, chaos, cancel) are hard to discover and create noise in gameplay.

## Solution

### 1. Clean Direction UI
Remove the fill bar (`#direction-fill`). Keep only the arrow (`#cauldron-arrow`) to indicate direction. Simplifies visual complexity while preserving direction information.

### 2. Expand Key Pool
Use all alphanumeric keys: `0-9` + `a-z` = 36 keys total. Larger pool increases randomization entropy and supports more players or longer play sessions without repetition.

### 3. Selective Key Randomization
Currently, all 8 keys (4 per player) shift after each press. Change to: when a player presses a key, only that single key re-randomizes for that player. All other keys (both players) stay fixed.

**Effect:** Reduces cognitive load. Players learn 3 key positions that don't change; only 1 key shifts per action. Prevents catastrophic key churn that would make the game unplayable with rapid presses.


## Constraints & Assumptions

- Removing reactions simplifies rules but removes a strategic layer. Gameplay becomes more about reading/reacting to pressure bars and direction arrows.
- Larger key pool (36 keys) still maintains collision-free selection (8 keys for 2 players, 2.5% collision risk vs 0.1% before).
- Direction arrow alone is sufficient for players to understand who's "winning".

## Learnings from Prior Work

From `2026-04-02-dynamic-keys-brewing`: randomization system is stable and decoupled from reaction logic. Removing reactions is a clean cut — no downstream side effects on key binding system.

From `2026-04-02-cauldron-clarity`: direction bar already has CSS for danger pulsing on pips. Removing fill bar doesn't affect pip rendering or danger detection.


# Design: Randomized Keys & Brewing Themes

## Problem

Current cauldron game has two issues:
1. **Muscle memory prevents engagement** — players memorize key positions and look at the screen instead of each other
2. **Theme inconsistency** — spell names (Fireball, Shield, Hex) don't match brewing/cauldron context

## Solution

### 1. Randomized Key Bindings
Every time a player presses a key successfully, the entire key set shifts to a new random configuration:
- 20 available keys total (`1-0`, `q-g`)
- Player 1 gets 4 random keys, Player 2 gets 4 different random keys
- No overlaps between players
- Keys re-randomize after each ingredient press

**Effect:** Players must constantly scan the keyboard instead of relying on muscle memory. Increases social engagement because players look at the board/keyboard, not exclusively at the screen.

### 2. Brewing-Themed Command Names
Replace spell names with ingredient/cauldron actions:
- **Fireball** → **Scald** (🔥 hot water effect)
- **Shield** → **Cool** (🧊 cooling/dampening)
- **Hex** → **Swirl** (🌀 stirring/reversing)
- **Brew** → **Boost** (✨ charging/brewing)

**Effect:** Theme coherence. Name change also discourages muscle memory (familiar spell names would reinforce old habits).

### 3. Two-Stage Onboarding
**Stage 1:** "CAULDRON TUG-OF-WAR"
- Explain core mechanic: both players throw ingredients, pressure builds, direction decides who loses
- Show all four ingredient names and what they do

**Stage 2:** "THE TWIST"
- Warn players that keys randomize on every press
- Show all 20 available keys
- Explain: "Find your next key before acting"

**Effect:** Players understand the game rules (Stage 1) then the constraints (Stage 2) before the first round.

## Constraints & Assumptions

- Game runs entirely in browser, no server
- Key randomization is non-blocking (doesn't halt gameplay)
- 20 available keys provide sufficient entropy (binomial probability of overlap is ~0.1%)
- Simultaneous presses from both players might collide on same new key, but this is rare and harmless (second player's next press will randomize again)

## Learnings from Prior Work

From `2026-04-02-cauldron-clarity`: onboarding screen structure is already in place (`showOnboarding()`). Two-stage design requires screen state tracking (`onboardingScreen = 1 | 2`) and SPACE-only input in IDLE.


# Arcane Akash — MVP (Keyboard Only)

## Goal
Prove the core loop works: attack, defend, resolve, swap. No voice yet. Keys stand in for spells.

## Players
- Player 1: keys 1, 2, 3
- Player 2: keys 8, 9, 0

## Spells (3 total)
| Key (P1) | Key (P2) | Spell     | Beats     | Loses to  |
|----------|----------|-----------|-----------|-----------|
| 1        | 8        | Fireball  | Hex       | Shield    |
| 2        | 9        | Shield    | Fireball  | Hex       |
| 3        | 0        | Hex       | Shield    | Fireball  |

Rock-paper-scissors triangle. That's it.

## Turn flow
1. Screen shows "PLAYER X — ATTACK!" with a 3-second countdown
2. Attacker presses one of their 3 keys to pick a spell
3. Screen shows the chosen attack spell (e.g. "FIREBALL!")
4. Screen shows "PLAYER Y — DEFEND!" with a 2-second countdown
5. Defender presses one of their 3 keys
6. **Resolve:**
   - Defender's spell beats attacker's → blocked, roles swap
   - Attacker's spell beats defender's → hit, round over
   - Same spell → clash, roles swap
   - Defender didn't press in time → hit, round over
7. Roles swap, repeat from step 1

## Screen layout
```
  [Round: 1]     [P1: 0 wins]  [P2: 0 wins]

      PLAYER 1          vs          PLAYER 2
       (avatar)                     (avatar)

              >>> FIREBALL! >>>

     [ COUNTDOWN: 2s — DEFEND! ]

  [1: Fireball]  [2: Shield]  [3: Hex]
```

Just text and simple shapes is fine. Two boxes for avatars, a center area for spell names and countdown, bottom bar showing the key mappings.

## Win condition
- One hit = round over
- First to 3 rounds = game over
- Show winner screen, press any key to restart

## What this MVP validates
- The attack/defend alternation feels good
- The countdown pressure creates tension
- The rock-paper-scissors counterplay has enough depth
- The pacing is right (too fast? too slow? adjust timers)

## What this MVP skips
- Voice input (next iteration)
- Volume mechanic
- Spell hijack / scramble
- Animations beyond basic text/transitions
- Art, theming, Akash branding
- Spell variety beyond 3

## Tech
- Single HTML file with vanilla JS
- No dependencies
- Canvas or even just DOM elements
- State machine: READY → ATTACK_PHASE → DEFEND_PHASE → RESOLVE → ROUND_END → loop

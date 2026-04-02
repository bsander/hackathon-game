# Implement — 2026-04-02

## Key Learnings

- **Key randomization requires DOM updates, not just state changes** — When key bindings shift, the `.key-row` elements must be updated with new keys via `data-key` and displayed text. Otherwise, players see stale key labels.

- **Two-stage onboarding needs explicit state tracking** — The `onboardingScreen` variable must track which screen the user is on (1 = intro, 2 = twist explanation) to correctly advance on SPACE. Without this, Screen 1 would immediately advance to COUNTDOWN instead of showing Screen 2 first.

- **Ingredient name consistency spans multiple files** — Renaming ingredients (fireball→scald, etc.) required updates across:
  - Constants (INGREDIENTS object, INGREDIENT_ORDER, REACTIONS keys)
  - Game logic (cooldown duration logic references by name)
  - Test files (all assertions and describe blocks)
  - Onboarding UI (still had hardcoded old names)
  This enforces the importance of searching comprehensively for all references before assuming a rename is complete.

- **Fisher-Yates shuffle for 8-key selection is efficient** — Drawing 8 non-overlapping keys from 20 using Fisher-Yates shuffle has very low collision probability (~0.1% overlap risk). No need for collision detection loops.

- **SPACE input handling in IDLE state handles multiple use cases** — The same `e.key === ' '` check in IDLE state gates game start, restart after game over, and screen transitions. Adding explicit screen state variable (`onboardingScreen`) avoids branching complexity.


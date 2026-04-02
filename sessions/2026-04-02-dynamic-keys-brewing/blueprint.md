# Blueprint: Randomized Keys & Brewing Themes

**Design:** [design.md](design.md)

## Task Execution Order

All tasks modify `constants.js` and `game.js` independently except Task 4 which depends on Task 1.

```
Task 1 (Brewing ingredient names) ─┬→ Task 4 (Rebuild + test)
Task 2 (Randomized key logic) ──────┤
Task 3 (Second intro screen) ───────┘
```

## Tasks

### Task 1: Rename ingredients to brewing theme ✓ COMPLETE
**What:** Updated `INGREDIENTS` object in `constants.js` with brewing-themed names. Updated all references across `game.js`, `ingredients.js`, test files, and onboarding UI.

**Status:** ✓ All ingredient names changed (scald, cool, swirl, boost). Tests pass (121/121). Bundle rebuilt.

### Task 2: Randomized key binding system ✓ COMPLETE
**What:** Added to `constants.js`:
- `ALL_KEYS` array with 20 available keys
- `KEYS_PER_PLAYER = 4` constant
- `getRandomKeyBinding()` using Fisher-Yates shuffle for 8 non-overlapping keys
- Updated `ingredientForKey(key, keyBindings)` to accept optional bindings parameter

Updated `game.js`:
- `currentKeyBindings` state, initialized and randomized after each press
- `updateKeyRowsDisplay()` function updates DOM with new key labels
- Keydown handler calls `getRandomKeyBinding()` after successful press and re-renders UI

**Status:** ✓ Keys randomize after each press, no overlaps, all 14 tests pass.

### Task 3: Second intro screen explaining randomization ✓ COMPLETE
**What:** Modified `showOnboarding()` in `game.js`:
- Screen 1: "CAULDRON TUG-OF-WAR" with ingredient descriptions and new brewing theme names
- Screen 2: "THE TWIST" explaining key randomization and showing all 20 available keys
- Added `onboardingScreen` state variable (1 = intro, 2 = twist)
- SPACE on Screen 1 → advances to Screen 2
- SPACE on Screen 2 → enters COUNTDOWN

Updated ingredient names in onboarding to match brewing theme (Scald, Cool, Swirl, Boost).

**Status:** ✓ Two-stage onboarding complete, SPACE-only input enforced.

### Task 4: Build and smoke test ✓ COMPLETE
**What:** Ran `npm run build:mvp3` and `npm test`.

**Status:** ✓ All tests pass (121/121). Bundle built (18.1kb). Ready for browser testing.

**Remaining verification:** Manual browser test to confirm:
- Two onboarding screens appear in sequence
- Keys randomize visibly after each press
- New ingredient names (Scald, Cool, Swirl, Boost) display throughout
- Game plays normally with key randomization

## Edge Cases and Failure Modes

| Failure | Mitigation |
|---|---|
| Simultaneous key presses from both players land on same key before randomization | Rare; second player's press will randomize afterward. No state corruption. |
| Player presses key that's now invalid (old binding persists in muscle memory) | Correct — the key simply won't map. Next random keys are shown on screen. |
| Onboarding screen 1 transition timing | Screen state is explicit; advance only on SPACE in IDLE state. |
| Key binding randomization during overlay states | Only randomize in ROUND_ACTIVE; safe from race conditions. |
| All 20 keys run out of entropy | Not possible; we pick 8 of 20 randomly, very low collision probability. |


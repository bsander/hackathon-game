# Blueprint: Cauldron Clarity & Balance

**Design:** [design.md](design.md)

## Task Execution Order

All tasks are sequential — they share `game.js`. Task 5 depends on Task 1's `cooldownDuration` variable.

```
Task 1 (Fireball cooldown) ─────┬──→ Task 5 (Cooldown dimming)
                                 │
Task 2 (Onboarding + SPACE) ────┤
Task 3 (Enhanced reactions) ────┤──→ Task 8 (Build + smoke test)
Task 4 (Floating labels) ───────┤
Task 6 (Direction danger) ──────┤
Task 7 (Hint banner) ───────────┘
```

## Tasks

### Task 1: Fireball cooldown rebalance
**What:** Add `FIREBALL_COOLDOWN_MS = 1200` to `constants.js`. Update keypress handler in `game.js` to compute `cooldownDuration` per ingredient and use it when setting `cooldownUntil[player]`.
**Why:** Fireball spam dominates because it has the same 500ms cooldown as other spells despite being strongest on both axes. A tempo cost creates a genuine trade-off.
**Verification:** Fireball presses enforce 1200ms gap; other spells enforce 500ms.
**Test intent:** Verify that the cooldown duration applied after a Fireball press is 1200ms and after other ingredients is 500ms.

### Task 2: Onboarding screen + SPACE-to-start
**What:** Replace IDLE overlay with a how-to-play screen (concept line, ingredient descriptions, key mappings). Change GAME_OVER sub-text to "Press SPACE to play again". Restrict keydown handler to `e.key === ' '` in IDLE and GAME_OVER states.
**Why:** Players currently start by accident ("any key") and have no information about what the four ingredients do before playing.
**Verification:** Only SPACE starts/restarts. Overlay shows ingredient descriptions and key mappings.
**Test intent:** Verify SPACE advances from IDLE and GAME_OVER; verify other keys are ignored in those states.
**Note:** Three locations must change together: `game.js:159` (IDLE overlay), `game.js:209` (GAME_OVER overlay), `game.js:236` (keydown condition).

### Task 3: Enhanced reaction labels
**What:** Update the `labels` object in `showReaction()` to include explanations for all 6 reaction types.
**Why:** Current labels ("COUNTERED!") don't explain what happened. Players see the word but don't learn the mechanic.
**Verification:** Each reaction displays name + explanation (e.g. "COUNTERED! — direction negated").
**Test intent:** Verify all 6 reaction label strings include an explanatory suffix.

### Task 4: Floating delta labels
**What:** Add `spawnFloatingLabel(text, player)` helper that creates a temporary DOM element, animates it, and self-removes on animation end. Call from keypress handler after `applyIngredient`, with text derived from ingredient type. Add CSS keyframe animation (use a distinct name from `float-up`).
**Why:** Players can't see what their keypresses do. Floating numbers provide immediate per-action feedback.
**Verification:** Each ingredient press shows a floating label. Labels self-remove from DOM.
**Test intent:** Verify label text matches each ingredient's effect description.
**Note:** Max one active label per player to avoid clutter. Use `animationend` listener or `setTimeout` for cleanup.

### Task 5: Cooldown dimming on key rows
**What:** After setting `cooldownUntil[player]`, add `.on-cooldown` to all key rows for that player. Set `setTimeout` using `cooldownDuration` (per-ingredient, not global `COOLDOWN_MS`) to remove the class.
**Why:** Players don't know they're rate-limited. Dimmed keys communicate that input is temporarily unavailable, and Fireball's longer dim communicates its higher tempo cost.
**Verification:** Key rows dim during cooldown. Fireball key row stays dimmed for 1200ms; others for 500ms.
**Test intent:** Verify the dim class is applied for the correct duration per ingredient type.
**Depends on:** Task 1 (needs `FIREBALL_COOLDOWN_MS` and ingredient-specific cooldown logic).
**Note:** `.key-row.on-cooldown` CSS already exists at `style.css:102-104` — just needs JS wiring.

### Task 6: Direction danger colouring
**What:** Extend `renderDirection()` to toggle a `.danger` class on the losing player's pip elements when `Math.abs(direction) >= 7`. Add `.pip.danger` CSS with a red pulse animation.
**Why:** Players can't tell who is "losing" when the direction bar is extreme. Red pulsing pips create urgency.
**Verification:** Pips pulse red at extreme direction, return to normal below threshold.
**Test intent:** Verify danger class applied when direction reaches ±7, removed below.

### Task 7: First-round hint banner
**What:** Add a hint banner element. Show during round 1 with "TIP: 🛡 right after their 🔥 counters it!". Hide when round advances past 1 (in ROUND_PAUSE state).
**Why:** The Shield-counters-Fireball reaction is the single most important strategic discovery. A contextual hint accelerates that discovery.
**Verification:** Banner visible in round 1, hidden from round 2 onward.
**Test intent:** Verify banner visibility tied to round number.

### Task 8: Build and smoke test
**What:** Run `npm run build:mvp3`. Open `mvp3-final-dog/index.html` in browser. Verify all pillars integrated.
**Why:** `bundle.js` is a build artefact — source changes don't take effect in the browser until rebuilt.
**Verification:** All features function via `file://` — onboarding → SPACE → floating labels → Fireball cooldown visible → reactions descriptive → danger colouring → hint banner round 1 only.
**Test intent:** End-to-end manual verification of integrated features.

## Edge Cases and Failure Modes

### From design (ideate phase)
| Failure | Likelihood | Mitigation |
|---|---|---|
| Players skip/ignore onboarding screen | Medium | Floating labels teach through play regardless |
| Floating labels create visual noise | Medium | One active per player, small font, 800ms fade |
| 1200ms Fireball cooldown feels sluggish | Low | Key dimming communicates intentionality. Easy to tune constant |
| Players still don't discover reactions | Medium | Hint banner + enhanced reaction labels address organically |

### From impact analysis (blueprint phase)
| Edge case | Mitigation |
|---|---|
| IDLE/GAME_OVER text and handler must change together (3 locations) | Task 2 addresses all three in one task |
| Cooldown dimming timeout must use ingredient-specific duration | Task 5 depends on Task 1; uses same `cooldownDuration` variable |
| Floating label keyframe name collision with `showReaction`'s `float-up` | Task 4 uses a distinct keyframe name |
| SPACE is not a game key (`ingredientForKey` returns null for it) | Safe — SPACE never triggers ingredient logic |

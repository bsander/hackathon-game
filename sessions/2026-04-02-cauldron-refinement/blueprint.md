# Blueprint: Cauldron Refinement — UI Cleanup, Selective Key Randomization & Mechanics Simplification

**Design:** [design.md](design.md)

## Task Execution Order

Tasks 1 and 2 are independent and can run in parallel. Task 3 (selective randomization) depends on Task 1 (expanded key pool).

```
Task 1 (Expand keys to 36) ────→ Task 3 (Selective randomization)

Task 2 (Remove fill bar) ─────────────────────────────────────────
```

## Tasks

### Task 1: Expand Key Pool from 20 to 36 Keys ✓ COMPLETE
**Status:** All 36 alphanumeric keys in use. Onboarding grid updated. CSS layout 9×4. Tests: 126 pass.

### Task 2: Remove Direction Fill Bar ✓ COMPLETE
**Status:** Direction fill bar removed from HTML, JS, and CSS. Arrow rendering preserved. Pip danger coloring intact.

### Task 3: Selective Key Randomization (Per-Key, Not Full Rebind) ✓ COMPLETE
**Status:** `randomizeOneKey()` implemented. Only pressed key shifts; others stay fixed. 5 new tests added. All 131 tests pass.

**Behavior change:** Pressing any key now randomizes only that key (not all 8). Reduces cognitive load, improves learnability.

## Edge Cases and Failure Modes

| Failure | Mitigation |
|---|---|
| **Key collision during single-key randomization** | `randomizeOneKey()` checks against opponent's current keys before selection. Very low probability with 36-key pool (binomial: ~0.3% for 8 keys). |
| **Player presses key that's not in current bindings (stale muscle memory)** | Correct — key simply won't map. Next randomized key is shown on screen. |
| **UI doesn't update after selective randomization** | Only update the affected key-row DOM element, not entire key display. |
| **Game state out of sync if randomization fails** | Defensive: always update both state and DOM together in a single operation. |
| **Direction arrow disappears after removing fill bar** | Arrow rendering logic is separate; keep lines 78-89 in `renderDirection()` intact. |
| **Larger key pool increases string comparison costs** | Negligible — `ALL_KEYS` is 36 items, lookup is O(1) in hash map via `ingredientForKey()`. |

## Parallel Execution Plan

Tasks 1 and 2 can run in parallel (no inter-dependencies). Task 3 waits for Task 1 to complete (needs expanded key pool).

**Parallelization strategy:**
- Spawn 2 agents for Tasks 1 and 2 concurrently
- After Task 1 completes, spawn agent for Task 3
- Total execution: ~2 sequential phases (parallel-then-sequential)


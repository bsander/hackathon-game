# Arcane Akash — Playtest Feedback Blueprint

**Date:** 2026-04-02

## Task Plan

### Cluster A — No dependencies (parallel)

#### Task 1: Invert score model to health pips
Change `scores` from counting wins upward (0→3) to counting health downward (3→0). Rename `WIN_SCORE` to `START_HEALTH`. Win condition: opponent's health ≤ 0. Affects `resolve()` → `nextStateAfterResolve()`, `renderPips()`, and IDLE/GAME_OVER reset logic.

**Why:** Backfire (pip loss from mashing) requires a model where pips can be removed.

**Verification:** Game starts with 3 filled pips per player. A HIT empties one of the defender's pips. GAME_OVER triggers when a player reaches 0 pips. Visually identical to current behaviour.

**Test intent:** Health reduces by 1 on HIT. GAME_OVER triggers when health reaches 0. Health resets to 3 on new game. No off-by-one at the winning threshold.

#### Task 2: Visual turn ownership (glow + dim)
Active player's column gets a bright glow border (orange for attacker, blue for defender). Inactive column dims to 40% opacity. Mirror active/inactive class onto `#p1-panel`/`#p2-panel` in `renderRoles()` since spell panels are separate DOM elements from `.player-col`.

**Why:** Playtesters couldn't tell whose turn it was.

**Verification:** During ATTACK_PHASE, attacker's column glows orange, defender's side dimmed. During DEFEND_PHASE, defender's column glows blue, attacker's side dimmed. IDLE/GAME_OVER: no glow, no dim.

**Test intent:** `renderRoles()` applies correct classes based on state and attacker value.

#### Task 3: Consolidated instruction bar + space bar to start + RPS legend
Replace `#spell-banner` and `#phase-label` with a single `#instruction-bar` element. Context-sensitive text per state showing actual slot contents (Chaos labelled as `CHAOS ❓`). IDLE/GAME_OVER require space bar specifically. Add permanent RPS legend in a corner (`🔥 > 💀 > 🛡 > 🔥 | 🌀 = random, resets on cast`).

**Why:** Playtesters had no guidance. Two text elements competed for attention.

**Verification:** Each state shows correct instruction text. Chaos slots show as `CHAOS ❓`. Only space bar starts/restarts. RPS legend always visible.

**Test intent:** IDLE/GAME_OVER handlers only accept space bar. Instruction text renders correct slot contents including Chaos states.

#### Task 4: Input pre-dispatch (key ownership detection)
Add `playerForKey(key)` helper to utils. Restructure the keydown listener to determine key ownership before delegating to state handlers. This is the foundation for backfire and fizzle.

**Why:** Both backfire and fizzle need key ownership determined before the state handler runs.

**Verification:** `playerForKey('1')` → 1, `playerForKey('8')` → 2, `playerForKey(' ')` → null. Existing game flow unchanged.

**Test intent:** Correct player for all game keys, null for non-game keys. No regressions in attack/defend flow.

### Cluster B — Depends on Cluster A

#### Task 5: Backfire self-damage (depends on 1 + 4)
Track `misfireCount` per player, reset to 0 on every `enterState()`. When the inactive player presses their own keys: 1st press per phase = warning spark + "Careful!" flash on their column; 2nd+ press = `BACKFIRE!` explosion animation + lose 1 health pip. If health reaches 0 from backfire, clear timers and trigger GAME_OVER. Floor health at 0.

**Why:** Mechanical backstop against button mashing with a teachable first warning.

**Verification:** First out-of-turn own-key press shows warning, no pip loss. Second press loses 1 pip with explosion. Counter resets on state transition. Backfire at health=1 triggers GAME_OVER. No action at health=0.

**Test intent:** Misfire count increments correctly. 1st misfire = no score change. 2nd = health -1. GAME_OVER at 0 via backfire. Counter resets on state change.

#### Task 6: Soft fizzle for wrong-player keys (depends on 4)
When a player presses keys belonging to the other player: brief "Not your turn!" flash on their column. No penalty.

**Why:** Orientation confusion is distinct from mashing. Gentle feedback, not punishment.

**Verification:** P1 pressing `8` shows fizzle on P1's column. No pip change, no state change.

**Test intent:** Pressing opponent's keys during any active state triggers fizzle text and no score change.

#### Task 7: MORPH_DISPLAY state (depends on 1)
New state between RESOLVE and the next phase. `resolve()` computes morph events and stores them + the next-state decision in module-level variables. After the 1.2s overlay display, transition to MORPH_DISPLAY. MORPH_DISPLAY shows morph animations for 1.5s, input ignored, then routes to the stored next state. **Skip MORPH_DISPLAY entirely when no morph events exist** (e.g. fumbles). Add MORPH_DISPLAY to visibilitychange pause/resume handler (timer restart only, no countdown bar).

**Why:** The 0.6s inline morph was invisible and competed with the resolution overlay.

**Verification:** After resolution with morph events: overlay clears → 1.5s MORPH_DISPLAY → correct next state. Without morph events: skip directly to next state. Input ignored during MORPH_DISPLAY. Pause/resume works correctly.

**Test intent:** Morph events pass correctly from resolve to MORPH_DISPLAY. Post-morph routing matches pre-refactor behaviour. Pause/resume handles MORPH_DISPLAY. Empty morph events skip the state.

#### Task 8: Commitment ceremony + theatrical pip loss (depends on 1)
"LOCKED IN ✦" gold flash on active player's column when valid keypress accepted (both attack and defend phases). Pip loss: losing player's column flashes red + the specific pip element shatters with a burst animation. No screen shake. Winner's side stable.

**Why:** Makes keypresses feel consequential. Makes pip loss dramatic and spectator-readable.

**Verification:** Valid keypress in ATTACK/DEFEND shows gold flash on active column. Pip loss triggers shatter on the correct pip. No global effects.

**Test intent:** Commitment flash triggers for both attacker and defender. Shatter targets correct pip element.

### Cluster C — Depends on Cluster B

#### Task 9: Extended morph CSS (depends on 7)
Morph label and slot animations extended from 0.6s to 1.5s to match MORPH_DISPLAY duration. Labels enlarged and use distinct colours (red for degradation, green for restoration). "SPELLS SHIFTING..." banner during MORPH_DISPLAY state.

**Why:** Current 0.6s morph feedback was invisible to playtesters.

**Verification:** Animations play for full 1.5s. Labels legible from distance. Banner visible during morph. Animations complete before next state.

**Test intent:** (Visual/CSS — timing alignment with MORPH_DISPLAY state duration.)

## Dependency Graph

```
Cluster A (parallel):
  Task 1: Score model inversion
  Task 2: Visual turn ownership
  Task 3: Instruction bar + space + RPS legend
  Task 4: Input pre-dispatch

        │
        ▼

Cluster B (parallel, after A):
  Task 5: Backfire self-damage        ← depends on 1 + 4
  Task 6: Soft fizzle                 ← depends on 4
  Task 7: MORPH_DISPLAY state         ← depends on 1
  Task 8: Commitment + pip theatrics  ← depends on 1

        │
        ▼

Cluster C:
  Task 9: Extended morph CSS          ← depends on 7
```

## Edge Cases and Failure Modes

| Edge Case | Source | Mitigation |
|---|---|---|
| Backfire drops health to 0 mid-phase while timer running | Impact analysis | `clearTimer()` before `enterState('GAME_OVER')` — same pattern as RESOLVE_FUMBLE |
| Backfire at health 0 | Impact analysis | Floor check: `if (health[player] <= 0) return` before decrement |
| Empty morph events (fumble, no spell cast) | Design + user decision | Skip MORPH_DISPLAY entirely, route directly to next state |
| Tab hidden during MORPH_DISPLAY | Prior learning (timer state management) | Add MORPH_DISPLAY to visibilitychange handler. Store remaining time, resume on return. |
| Instruction bar shows stale slot contents after morph | Impact analysis | Call `renderInstructionBar()` in MORPH_DISPLAY and on every `enterState()` |
| Score model inversion breaks `nextStateAfterResolve` tests | Prior learning (off-by-one) | Update function and tests together. Threshold inverts: `health - 1 <= 0` replaces `score + 1 >= winScore` |
| Overlay covers instruction bar during RESOLVE | Impact analysis | Instruction bar at z-index ≥ 15 (same as spell panels). Or clear instruction text during overlay. |
| Spell panel dimming doesn't reach `#p1-panel`/`#p2-panel` | Impact analysis (DOM structure) | Mirror active/inactive class onto spell panels in `renderRoles()` — they're siblings, not children of `.player-col` |

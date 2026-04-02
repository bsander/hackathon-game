# Arcane Akash — Spell Morphing Blueprint

**Date:** 2026-04-02
**Design:** [design.md](design.md)

## Impact Summary

The spell morphing system touches every file in the MVP. Key structural changes:

- **New mutable state:** Per-player spell slots (`playerSlots`) replacing static key-to-spell mappings
- **Shuffling removal:** The defend-phase key shuffling is replaced by spell morphing as the complexity source
- **Resolution extension:** `resolveSpells` needs a Chaos branch (50/50 random, bypassing BEATS)
- **No new state machine state:** Morph logic inlines into the existing resolve flow, avoiding timer/pause complexity
- **UI restructure:** Single 3-hint footer → two always-visible spell panels (6 slots total) + info bar
- **DOM changes:** `index.html` needs new elements for spell panels; existing hint elements repurposed or replaced

### Design adjustment (from blueprint)

The design specified a separate MORPH state (0.8s timer after RESOLVE). This is inlined into the existing RESOLVE timeout instead — morph logic fires during the 1.2-1.5s post-resolve delay. This eliminates a state, a timer, and pause/resume handling for that state. Prior sessions flagged timer handling across states as error-prone.

## Tasks

### Task 1: Add per-player spell slot state

**What:** Introduce a mutable `playerSlots` data structure in `game.js` tracking each player's 3 spell slots. Add `SLOT_DEFAULTS` constant to `constants.js` mapping slot indices to original spell names. Initialise slots on game start and round start. Expose a `resetSlots()` and `morphSlot(player, slotIndex, newSpell)` function.

**Why:** Every subsequent task depends on mutable slot state existing. Currently spells are statically derived from `P1_KEYS`/`P2_KEYS`.

**Verification:**
- Slots initialise to `['Fireball', 'Shield', 'Hex']` for both players
- `morphSlot(1, 0, 'Chaos')` sets P1 slot 0 to Chaos
- Round reset restores all slots to Standard
- Slot state persists across turns within a round

**Test intent:** Verify slot initialisation, per-slot mutation, round reset restores all Standard.

**Files:** `js/constants.js`, `js/game.js`

---

### Task 2: Wire slot state into input handling and resolution

**What:** Replace static `keysForPlayer()` / `shuffledKeyMap` lookups in ATTACK_PHASE and DEFEND_PHASE handlers with reads from `playerSlots`. Remove shuffled key map logic from DEFEND_PHASE entirely. Defender uses fixed key mappings reading current slot contents. Pass the actual spell from the slot to resolution.

**Why:** Input handling must reflect current slot state for morphing to have gameplay effect. Shuffling removal is a deliberate design choice (spell morphing replaces it).

**Verification:**
- Pressing key `1` as P1 casts whatever spell is in P1 slot 0
- If P1 slot 0 is Chaos, pressing `1` casts Chaos
- Defend phase uses fixed key positions, no shuffling
- Existing RPS resolution still works correctly with Standard spells

**Test intent:** Verify mutated slot results in correct spell passed to resolution. Verify no shuffling occurs in defend phase.

**Files:** `js/game.js`, `js/utils.js` (shuffleArray becomes unused for gameplay)

---

### Task 3: Add Chaos resolution logic

**What:** Extend `resolveSpells` in `resolution.js` to handle Chaos: when either spell is `'Chaos'`, resolve with 50/50 random outcome (HIT or BLOCKED), ignoring BEATS. Add `'Chaos'` to exports in constants if needed.

**Why:** Without this, Chaos spells fall through to BEATS lookup → `undefined` → broken resolution.

**Verification:**
- Chaos vs any Standard spell → randomly HIT or BLOCKED (never CLASH, never undefined)
- Chaos vs Chaos → randomly HIT or BLOCKED
- Standard vs Standard → unchanged RPS behaviour (all 9 combinations)

**Test intent:** Verify all Chaos combinations produce valid outcomes. Verify Standard resolution unaffected. Test with mocked randomness for deterministic verification.

**Files:** `js/resolution.js`, `js/constants.js`, `test/resolution.test.js`

---

### Task 4: Add morph-on-cast

**What:** After resolution in the `resolve()` function, the attacker's used slot degrades: Standard → Chaos. If the used slot was already Chaos, it resets to its original Standard spell (from `SLOT_DEFAULTS`). Apply before the post-resolve timeout.

**Why:** Core mechanic — casting degrades your spells, creating mounting pressure.

**Verification:**
- After attacking with slot 0 (Fireball), P1 slot 0 becomes Chaos
- After attacking with slot 0 (Chaos), P1 slot 0 becomes Fireball
- Defender's slots are unaffected by morph-on-cast
- Slot display updates to reflect the change

**Test intent:** Verify Standard → Chaos degradation. Verify Chaos → Standard reset. Verify only the used slot is affected. Verify defender unaffected.

**Files:** `js/game.js`

---

### Task 5: Add morph-on-hit

**What:** When outcome is HIT or TIMEOUT, one of the defender's Standard slots is randomly degraded to Chaos. If all defender slots are already Chaos, no additional penalty. Apply in `resolve()` after morph-on-cast.

**Why:** The opponent-disruption layer — getting hit makes your future turns harder.

**Verification:**
- On HIT, one defender Standard slot becomes Chaos
- If defender has 2 Standard + 1 Chaos, only a Standard slot is picked
- If all 3 are Chaos, no change occurs
- BLOCKED and CLASH do not trigger morph-on-hit

**Test intent:** Verify triggers only on HIT/TIMEOUT. Verify only Standard slots targeted. Verify no-op when all Chaos. Verify BLOCKED/CLASH don't trigger.

**Files:** `js/game.js`

---

### Task 6: Restructure UI for spell slot display

**What:** Replace the single 3-hint footer with two spell panels (one per player) always visible. Each slot shows: key label, spell name, emoji (🔥/🛡/💀 for Standard, 🌀 for Chaos). Chaos slots get distinct styling (purple/dark theme). Add permanent info bar at bottom: `🌀 = Chaos (random outcome, resets on cast)`. Add a one-line spell description in the centre area showing the selected spell's behaviour.

**Why:** Both players' loadouts must be always visible for morphing to be readable rather than confusing. This is the legibility foundation.

**Verification:**
- All 6 slots visible at all times
- Chaos slots visually distinct (different colour, 🌀 emoji)
- Slot display updates after morph events
- Info bar always present
- Selected spell description appears during ATTACK/DEFEND phases

**Test intent:** Verify slot display reflects current `playerSlots` state. Verify Chaos and Standard have distinct visual treatment. Verify display updates after morph.

**Files:** `index.html`, `style.css`, `js/game.js`

---

### Task 7: Add morph feedback animations

**What:** When a slot morphs, show a brief cause label flash (0.6s):
- `"CAST → CHAOS"` — red flash, degradation
- `"HIT → CHAOS"` — red flash, degradation
- `"CAST → RESTORED!"` — green flash + ↑ indicator, restoration

Restoration must be visually distinct from degradation (green vs red, upward vs downward indicator).

**Why:** Without cause-attributed feedback, morph events read as random noise (design blocker). The escape valve (Chaos reset) must be discoverable.

**Verification:**
- Each morph event shows correct cause label
- Degradation flash is red, restoration flash is green with ↑
- Labels disappear after 0.6s
- Multiple simultaneous morphs (cast + hit in same turn) display on their respective slots without overlap

**Test intent:** Verify correct cause label per trigger. Verify visual distinction between degradation and restoration. Verify concurrent morph display.

**Files:** `style.css`, `js/game.js`

---

### Task 8: Polish and rebuild

**What:** Final integration pass: smooth morph transitions, emoji rendering check, spectator-friendly font sizing (readable from 2m), rebuild bundle.js with esbuild, manual playtest of full game flow.

**Why:** Demo readiness. The hackathon audience watches from a distance.

**Verification:**
- Game loads without console errors
- Full play-through: start → cast → degrade → cast Chaos → restore → HIT → morph-on-hit → complete 3-round match
- Bundle.js up to date
- Text legible at 2m distance
- No visual glitches in morph animations

**Test intent:** End-to-end: full 3-round match exercising all morph paths (cast degrade, cast restore, hit degrade, all-Chaos no-op).

**Files:** all files, `bundle.js`

## Dependency Order

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

Strictly sequential. All tasks touch `game.js`; no parallel clusters possible without merge conflicts.

- T1-T5: logic layer (slot state, input wiring, resolution, morph mechanics)
- T6-T7: presentation layer (UI restructure, animations)
- T8: integration + demo prep

Each task produces a playable game state (the morph mechanics work with the old hint UI between T2-T5; full visual treatment arrives at T6-T7).

## Edge Cases and Failure Modes

**From design (ideate):**
- All 3 slots degrade to Chaos simultaneously → player casts any Chaos to start recovery. Maximum 1 turn of full Chaos. Mitigation: Chaos resets on cast.
- 50/50 random feels unfair deciding a round → by design, Chaos is a known risk visible to both players. The randomness IS the UNO moment.
- Turtling (avoiding casting to prevent degradation) → impossible; attacker must cast within 3s or fumble.

**From blueprint (impact analysis):**
- Chaos not in BEATS map → Task 3 adds explicit Chaos branch before BEATS lookup. If missed, `BEATS['Chaos']` returns `undefined` and resolution produces incorrect outcomes.
- Morph-on-hit with all-Chaos defender → Task 5 must filter for Standard slots before picking. If it picks a Chaos slot, it would re-degrade (no-op) but miss the "no additional penalty" design intent.
- Round reset timing → slots must reset at the start of ATTACK_PHASE after ROUND_END, not during ROUND_END display. If reset too early, the ROUND_END display might flash incorrect slot state.
- Defender timeout + morph-on-hit → TIMEOUT triggers morph-on-hit even though no defend spell was cast. The `resolve()` function handles TIMEOUT as a HIT variant, so morph-on-hit fires correctly.
- Inline morph in resolve → morph animations fire while the outcome overlay is visible. Slot panels must be visible behind/around the overlay, not obscured by it. CSS z-index: overlay covers the centre area but not the side spell panels.

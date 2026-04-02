# MVP2 Hand Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `mvp2/` — a copy of the MVP1 spell duel that adds a depleting hand of 5 random cards per player per round, side-panel hand display, and an empty-hand auto-hit rule.

**Architecture:** `mvp2/js/hand.js` owns all hand state logic (deal, spend, query). `game.js` imports it and checks for empty hands at the start of each phase. Side panels in HTML/CSS display both players' counts throughout the round.

**Tech Stack:** Vanilla JS (ES modules), esbuild bundler, Vitest for unit tests, no dependencies.

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `mvp2/js/constants.js` | Copy from MVP1 | Spell names, key maps, WIN_SCORE |
| `mvp2/js/utils.js` | Extend MVP1 | Add `filteredKeyMap`, `availableSpells` |
| `mvp2/js/hand.js` | New | Deal, spend, query hand state |
| `mvp2/js/resolution.js` | Copy from MVP1 | RPS resolution (unchanged) |
| `mvp2/js/game.js` | Rewrite | Hand integration, side panel rendering, empty-hand logic |
| `mvp2/index.html` | Extend MVP1 | Add `#p1-hand` and `#p2-hand` side panels |
| `mvp2/style.css` | Extend MVP1 | Add hand panel + depleted spell styles |
| `mvp2/test/hand.test.js` | New | Unit tests for hand module |
| `mvp2/test/utils.test.js` | New | Unit tests for new utils |
| `package.json` | Modify | Add `build:mvp2` script |

---

## Task 1: Scaffold mvp2 directory and build script

**Files:**
- Create: `mvp2/js/constants.js`
- Create: `mvp2/js/resolution.js`
- Modify: `package.json`

- [ ] **Step 1: Create `mvp2/js/constants.js`** (identical to MVP1)

```js
export const SPELLS = ['Fireball', 'Shield', 'Hex'];

export const BEATS = { Fireball: 'Hex', Shield: 'Fireball', Hex: 'Shield' };

export const P1_KEYS = { '1': 'Fireball', '2': 'Shield', '3': 'Hex' };
export const P2_KEYS = { '8': 'Fireball', '9': 'Shield', '0': 'Hex' };

export const WIN_SCORE = 3;
```

- [ ] **Step 2: Create `mvp2/js/resolution.js`** (identical to MVP1)

```js
import { BEATS } from './constants.js';

export function resolveSpells(attackSpell, defendSpell) {
  if (defendSpell === null || defendSpell === undefined) {
    return { outcome: 'HIT', attackSpell, defendSpell: null };
  }
  if (attackSpell === defendSpell) {
    return { outcome: 'CLASH', attackSpell, defendSpell };
  }
  if (BEATS[defendSpell] === attackSpell) {
    return { outcome: 'BLOCKED', attackSpell, defendSpell };
  }
  return { outcome: 'HIT', attackSpell, defendSpell };
}

export function nextStateAfterResolve(outcome, currentScore, winScore) {
  if (outcome === 'HIT') {
    const newScore = currentScore + 1;
    return {
      scoreChange: 1,
      next: newScore >= winScore ? 'GAME_OVER' : 'NEXT_ROUND',
    };
  }
  return { scoreChange: 0, next: 'SWAP' };
}
```

- [ ] **Step 3: Add `build:mvp2` to `package.json`**

Replace the `"scripts"` block with:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "build": "esbuild mvp/js/game.js --bundle --outfile=mvp/bundle.js --format=iife",
  "build:mvp2": "esbuild mvp2/js/game.js --bundle --outfile=mvp2/bundle.js --format=iife"
},
```

- [ ] **Step 4: Verify build script resolves (game.js doesn't exist yet — expect error)**

```bash
npm run build:mvp2 2>&1 | head -5
```

Expected: error about missing `mvp2/js/game.js` (that's fine — confirms esbuild is wired up).

- [ ] **Step 5: Commit**

```bash
git add mvp2/js/constants.js mvp2/js/resolution.js package.json
git commit -m "feat(mvp2): scaffold directory and build script"
```

---

## Task 2: Hand module — `mvp2/js/hand.js`

**Files:**
- Create: `mvp2/js/hand.js`
- Create: `mvp2/test/hand.test.js`

- [ ] **Step 1: Write failing tests in `mvp2/test/hand.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { dealHand, spendCard, hasSpell, isEmpty, handCounts, availableSpells } from '../js/hand.js';

describe('dealHand', () => {
  it('returns exactly 5 cards', () => {
    expect(dealHand()).toHaveLength(5);
  });

  it('only contains valid spell names', () => {
    const valid = new Set(['Fireball', 'Shield', 'Hex']);
    for (const card of dealHand()) {
      expect(valid.has(card)).toBe(true);
    }
  });

  it('each deal is independent — different players can have different hands', () => {
    // Run 20 deals; at least one pair should differ (probability of all same ≈ 0)
    const hands = Array.from({ length: 20 }, () => dealHand().sort().join(','));
    expect(new Set(hands).size).toBeGreaterThan(1);
  });
});

describe('spendCard', () => {
  it('removes one instance of the spell', () => {
    const hand = ['Fireball', 'Fireball', 'Shield', 'Hex', 'Shield'];
    const result = spendCard(hand, 'Fireball');
    expect(result).toHaveLength(4);
    expect(result.filter(c => c === 'Fireball')).toHaveLength(1);
  });

  it('does not mutate the original hand', () => {
    const hand = ['Fireball', 'Shield', 'Hex', 'Fireball', 'Shield'];
    spendCard(hand, 'Shield');
    expect(hand).toHaveLength(5);
  });

  it('removes exactly one card even when multiple copies exist', () => {
    const hand = ['Hex', 'Hex', 'Hex', 'Shield', 'Fireball'];
    const result = spendCard(hand, 'Hex');
    expect(result.filter(c => c === 'Hex')).toHaveLength(2);
  });
});

describe('hasSpell', () => {
  it('returns true when spell is in hand', () => {
    expect(hasSpell(['Fireball', 'Shield', 'Hex', 'Fireball', 'Shield'], 'Hex')).toBe(true);
  });

  it('returns false when spell is not in hand', () => {
    expect(hasSpell(['Fireball', 'Fireball', 'Fireball', 'Shield', 'Shield'], 'Hex')).toBe(false);
  });
});

describe('isEmpty', () => {
  it('returns true for empty array', () => {
    expect(isEmpty([])).toBe(true);
  });

  it('returns false for non-empty hand', () => {
    expect(isEmpty(['Fireball'])).toBe(false);
  });
});

describe('handCounts', () => {
  it('returns correct counts for each spell type', () => {
    const hand = ['Fireball', 'Fireball', 'Shield', 'Hex', 'Fireball'];
    expect(handCounts(hand)).toEqual({ Fireball: 3, Shield: 1, Hex: 1 });
  });

  it('returns zero for missing spell types', () => {
    const hand = ['Shield', 'Shield', 'Shield', 'Shield', 'Shield'];
    expect(handCounts(hand)).toEqual({ Fireball: 0, Shield: 5, Hex: 0 });
  });
});

describe('availableSpells', () => {
  it('returns only spell types with count > 0', () => {
    const hand = ['Fireball', 'Fireball', 'Shield', 'Shield', 'Shield'];
    expect(availableSpells(hand).sort()).toEqual(['Fireball', 'Shield']);
  });

  it('returns all three types when all present', () => {
    const hand = ['Fireball', 'Shield', 'Hex', 'Fireball', 'Shield'];
    expect(availableSpells(hand).sort()).toEqual(['Fireball', 'Hex', 'Shield']);
  });

  it('returns empty array for empty hand', () => {
    expect(availableSpells([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- mvp2/test/hand.test.js 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module '../js/hand.js'`

- [ ] **Step 3: Create `mvp2/js/hand.js`**

```js
import { SPELLS } from './constants.js';
import { shuffleArray } from './utils.js';

// Each player draws from their own full deck of 15 cards (5 of each type)
const FULL_DECK = [...SPELLS, ...SPELLS, ...SPELLS, ...SPELLS, ...SPELLS];

export function dealHand() {
  return shuffleArray(FULL_DECK).slice(0, 5);
}

export function spendCard(hand, spell) {
  const idx = hand.indexOf(spell);
  if (idx === -1) return hand;
  return [...hand.slice(0, idx), ...hand.slice(idx + 1)];
}

export function hasSpell(hand, spell) {
  return hand.includes(spell);
}

export function isEmpty(hand) {
  return hand.length === 0;
}

export function handCounts(hand) {
  return Object.fromEntries(SPELLS.map(s => [s, hand.filter(c => c === s).length]));
}

export function availableSpells(hand) {
  return SPELLS.filter(s => hand.includes(s));
}
```

Note: `hand.js` imports `shuffleArray` from `./utils.js` — that file doesn't exist yet. Create a stub `mvp2/js/utils.js` for now so tests can run (full implementation in Task 3):

```js
export { shuffleArray } from '../../mvp/js/utils.js';
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- mvp2/test/hand.test.js 2>&1 | tail -10
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add mvp2/js/hand.js mvp2/js/utils.js mvp2/test/hand.test.js
git commit -m "feat(mvp2): add hand module with deal/spend/query"
```

---

## Task 3: Utils — add `filteredKeyMap` and `availableSpells` helpers

**Files:**
- Create: `mvp2/js/utils.js` (replace stub)
- Create: `mvp2/test/utils.test.js`

- [ ] **Step 1: Write failing tests in `mvp2/test/utils.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { filteredKeyMap } from '../js/utils.js';

describe('filteredKeyMap', () => {
  it('returns all keys for player 1 when all spells available', () => {
    const map = filteredKeyMap(1, ['Fireball', 'Shield', 'Hex']);
    expect(map).toEqual({ '1': 'Fireball', '2': 'Shield', '3': 'Hex' });
  });

  it('returns all keys for player 2 when all spells available', () => {
    const map = filteredKeyMap(2, ['Fireball', 'Shield', 'Hex']);
    expect(map).toEqual({ '8': 'Fireball', '9': 'Shield', '0': 'Hex' });
  });

  it('omits keys for depleted spell types', () => {
    const map = filteredKeyMap(1, ['Fireball', 'Shield']);
    expect(map).toEqual({ '1': 'Fireball', '2': 'Shield' });
    expect(map['3']).toBeUndefined();
  });

  it('returns empty object when no spells available', () => {
    expect(filteredKeyMap(1, [])).toEqual({});
  });

  it('handles single available spell', () => {
    const map = filteredKeyMap(2, ['Hex']);
    expect(map).toEqual({ '0': 'Hex' });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- mvp2/test/utils.test.js 2>&1 | tail -10
```

Expected: FAIL — `filteredKeyMap is not a function`

- [ ] **Step 3: Create full `mvp2/js/utils.js`**

```js
import { P1_KEYS, P2_KEYS } from './constants.js';

export function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function otherPlayer(p) {
  return p === 1 ? 2 : 1;
}

export function keysForPlayer(p) {
  return p === 1 ? P1_KEYS : P2_KEYS;
}

export function keyListForPlayer(p) {
  return p === 1 ? ['1', '2', '3'] : ['8', '9', '0'];
}

/**
 * Returns a key→spell map for `player` filtered to only the given spell types.
 * Keys for depleted spells are omitted entirely.
 */
export function filteredKeyMap(player, spells) {
  const full = keysForPlayer(player);
  return Object.fromEntries(
    Object.entries(full).filter(([_k, spell]) => spells.includes(spell))
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- mvp2/test/utils.test.js 2>&1 | tail -10
```

Expected: All tests PASS

- [ ] **Step 5: Run all tests to make sure nothing broke**

```bash
npm test 2>&1 | tail -15
```

Expected: All test suites PASS

- [ ] **Step 6: Commit**

```bash
git add mvp2/js/utils.js mvp2/test/utils.test.js
git commit -m "feat(mvp2): add filteredKeyMap util"
```

---

## Task 4: HTML — add hand side panels

**Files:**
- Create: `mvp2/index.html`

- [ ] **Step 1: Create `mvp2/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Arcane Akash — MVP2</title>
<link rel="stylesheet" href="style.css">
</head>
<body>

<div id="game">
  <!-- Header -->
  <div id="header">
    <span id="round-label">ROUND 1</span>
    <div class="score">
      <span class="score-label">P1</span>
      <span class="pip" id="p1-pip-0"></span>
      <span class="pip" id="p1-pip-1"></span>
      <span class="pip" id="p1-pip-2"></span>
    </div>
    <div class="score">
      <span class="score-label">P2</span>
      <span class="pip" id="p2-pip-0"></span>
      <span class="pip" id="p2-pip-1"></span>
      <span class="pip" id="p2-pip-2"></span>
    </div>
  </div>

  <!-- Arena -->
  <div id="arena">

    <!-- P1 hand panel (left) -->
    <div class="hand-panel" id="p1-hand">
      <div class="hand-label">P1 HAND</div>
      <div class="hand-count" id="p1-count-Fireball">🔥 ×0</div>
      <div class="hand-count" id="p1-count-Shield">🛡️ ×0</div>
      <div class="hand-count" id="p1-count-Hex">💀 ×0</div>
    </div>

    <div class="player-col" id="p1-col">
      <div class="avatar" id="p1-avatar">🧙</div>
      <div class="player-name">PLAYER 1</div>
      <div class="player-role" id="p1-role"></div>
    </div>

    <div id="centre">
      <div id="spell-banner"></div>
      <div id="phase-label"></div>
      <div id="countdown-container">
        <div id="countdown-bar"></div>
      </div>
      <div id="countdown-text"></div>
    </div>

    <div class="player-col" id="p2-col">
      <div class="avatar" id="p2-avatar">🧟</div>
      <div class="player-name">PLAYER 2</div>
      <div class="player-role" id="p2-role"></div>
    </div>

    <!-- P2 hand panel (right) -->
    <div class="hand-panel" id="p2-hand">
      <div class="hand-label">P2 HAND</div>
      <div class="hand-count" id="p2-count-Fireball">🔥 ×0</div>
      <div class="hand-count" id="p2-count-Shield">🛡️ ×0</div>
      <div class="hand-count" id="p2-count-Hex">💀 ×0</div>
    </div>

  </div>

  <!-- Overlay -->
  <div id="overlay">
    <div id="overlay-text"></div>
    <div id="overlay-sub"></div>
  </div>

  <!-- Paused -->
  <div id="paused">PAUSED</div>

  <!-- Footer -->
  <div id="footer">
    <span class="key-hint" id="hint-0"></span>
    <span class="key-hint" id="hint-1"></span>
    <span class="key-hint" id="hint-2"></span>
  </div>
</div>

<script src="bundle.js"></script>

</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add mvp2/index.html
git commit -m "feat(mvp2): add HTML with hand side panels"
```

---

## Task 5: CSS — hand panels and depleted spell styles

**Files:**
- Create: `mvp2/style.css`

- [ ] **Step 1: Create `mvp2/style.css`**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #0a0a1a;
  color: #e0e0e0;
  font-family: 'Courier New', monospace;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

#game {
  width: 960px;
  height: 500px;
  display: flex;
  flex-direction: column;
  border: 2px solid #333;
  border-radius: 8px;
  background: #111122;
  position: relative;
}

/* Header */
#header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid #333;
  font-size: 16px;
}

#round-label { color: #888; }

.score {
  display: flex;
  align-items: center;
  gap: 6px;
}

.score-label { color: #aaa; font-size: 14px; }

.pip {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #555;
  display: inline-block;
}

.pip.filled { background: #f0c040; border-color: #f0c040; }

/* Arena */
#arena {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 12px;
  position: relative;
}

/* Hand panels */
.hand-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: #1a1a2e;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 10px 12px;
  width: 110px;
  align-self: center;
}

.hand-label {
  font-size: 10px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 2px;
}

.hand-count {
  font-size: 15px;
  color: #ccc;
  transition: color 0.2s;
}

.hand-count.depleted {
  color: #333;
  text-decoration: line-through;
}

.player-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 140px;
}

.avatar {
  width: 80px;
  height: 100px;
  border: 3px solid #444;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  background: #1a1a2e;
  transition: background 0.1s;
}

.player-col.attacker .avatar { border-color: #e04040; }
.player-col.defender .avatar { border-color: #4080e0; }

.player-name { font-size: 14px; color: #aaa; }
.player-role { font-size: 12px; font-weight: bold; text-transform: uppercase; }
.player-col.attacker .player-role { color: #e04040; }
.player-col.defender .player-role { color: #4080e0; }

/* Centre area */
#centre {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 260px;
  text-align: center;
}

#spell-banner {
  font-size: 28px;
  font-weight: bold;
  color: #f0c040;
  min-height: 36px;
  letter-spacing: 2px;
}

#phase-label {
  font-size: 16px;
  color: #ccc;
}

#countdown-container {
  width: 200px;
  height: 16px;
  background: #222;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #444;
}

#countdown-bar {
  height: 100%;
  width: 100%;
  background: #40c040;
  border-radius: 8px;
  transition: background-color 0.3s;
}

#countdown-text {
  font-size: 14px;
  color: #888;
  min-height: 20px;
}

/* Outcome overlay */
#overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  z-index: 10;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

#overlay.visible { opacity: 1; pointer-events: auto; }

#overlay-text {
  font-size: 48px;
  font-weight: bold;
}

#overlay-sub {
  font-size: 18px;
  color: #aaa;
  margin-top: 8px;
}

/* Footer */
#footer {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 12px 24px;
  border-top: 1px solid #333;
  font-size: 16px;
}

.key-hint {
  padding: 4px 12px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #1a1a2e;
  color: #ccc;
}

.key-hint .key {
  color: #f0c040;
  font-weight: bold;
}

.key-hint.depleted {
  color: #333;
  border-color: #2a2a2a;
  text-decoration: line-through;
}

/* Hit flash animation */
@keyframes flash-red {
  0% { background: #e04040; }
  100% { background: #1a1a2e; }
}

.avatar.flash { animation: flash-red 0.4s ease-out; }

/* Paused overlay */
#paused {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 20;
  font-size: 36px;
  color: #f0c040;
  letter-spacing: 4px;
}

#paused.visible { display: flex; }
```

- [ ] **Step 2: Commit**

```bash
git add mvp2/style.css
git commit -m "feat(mvp2): add CSS with hand panel and depleted styles"
```

---

## Task 6: `game.js` — hand integration

**Files:**
- Create: `mvp2/js/game.js`

This is the core integration task. Study the logic carefully before implementing.

**Key differences from MVP1 `game.js`:**
1. New state: `hands = { 1: [], 2: [] }` — tracks each player's current hand array
2. `dealHands()` — called at game start and each new round
3. `renderHands()` — updates the side panel DOM elements
4. Empty-hand check at start of `ATTACK_PHASE` and `DEFEND_PHASE` — calls `resolveEmptyHand(emptyPlayer)`
5. `resolveEmptyHand(emptyPlayer)` — flashes the empty player, awards point to other player, transitions
6. In `ATTACK_PHASE` handler: spend attacker's card via `spendCard`
7. In `DEFEND_PHASE` setup: build shuffled key map from defender's available spells only (not all 3)
8. In `DEFEND_PHASE` handler: spend defender's card via `spendCard`
9. Key legend shows only available spells per phase (via `filteredKeyMap`)

- [ ] **Step 1: Create `mvp2/js/game.js`**

```js
import { SPELLS, WIN_SCORE } from './constants.js';
import { randBetween, shuffleArray, otherPlayer, filteredKeyMap, keyListForPlayer } from './utils.js';
import { resolveSpells, nextStateAfterResolve } from './resolution.js';
import { dealHand, spendCard, availableSpells, isEmpty, handCounts } from './hand.js';

// ── Game state ────────────────────────────────────────────────
let state = 'IDLE';
let activeTimer = null;
let rafId = null;
let scores = { 1: 0, 2: 0 };
let round = 1;
let attacker = 1;
let attackSpell = null;
let defendSpell = null;
let shuffledKeyMap = null;
let countdownStart = 0;
let countdownDuration = 0;
let paused = false;
let pausedRemaining = 0;
let hands = { 1: [], 2: [] };

// ── DOM refs ──────────────────────────────────────────────────
const $roundLabel = document.getElementById('round-label');
const $spellBanner = document.getElementById('spell-banner');
const $phaseLabel = document.getElementById('phase-label');
const $countdownBar = document.getElementById('countdown-bar');
const $countdownText = document.getElementById('countdown-text');
const $countdownContainer = document.getElementById('countdown-container');
const $overlay = document.getElementById('overlay');
const $overlayText = document.getElementById('overlay-text');
const $overlaySub = document.getElementById('overlay-sub');
const $pausedOverlay = document.getElementById('paused');
const $p1Col = document.getElementById('p1-col');
const $p2Col = document.getElementById('p2-col');
const $p1Role = document.getElementById('p1-role');
const $p2Role = document.getElementById('p2-role');
const $p1Avatar = document.getElementById('p1-avatar');
const $p2Avatar = document.getElementById('p2-avatar');
const $hints = [
  document.getElementById('hint-0'),
  document.getElementById('hint-1'),
  document.getElementById('hint-2'),
];

// ── Utility ───────────────────────────────────────────────────
function clearTimer() {
  if (activeTimer !== null) { clearTimeout(activeTimer); activeTimer = null; }
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}

function dealHands() {
  hands[1] = dealHand();
  hands[2] = dealHand();
}

// ── Rendering ─────────────────────────────────────────────────
function renderPips() {
  for (let p = 1; p <= 2; p++) {
    for (let i = 0; i < 3; i++) {
      const pip = document.getElementById(`p${p}-pip-${i}`);
      pip.classList.toggle('filled', i < scores[p]);
    }
  }
}

function renderRoles() {
  const atkCol = attacker === 1 ? $p1Col : $p2Col;
  const defCol = attacker === 1 ? $p2Col : $p1Col;
  const atkRole = attacker === 1 ? $p1Role : $p2Role;
  const defRole = attacker === 1 ? $p2Role : $p1Role;

  $p1Col.classList.remove('attacker', 'defender');
  $p2Col.classList.remove('attacker', 'defender');

  if (state === 'IDLE' || state === 'GAME_OVER') {
    atkRole.textContent = '';
    defRole.textContent = '';
    return;
  }

  atkCol.classList.add('attacker');
  defCol.classList.add('defender');
  atkRole.textContent = 'attacker';
  defRole.textContent = 'defender';
}

function renderHints(keyMap) {
  $hints.forEach(h => { h.innerHTML = ''; h.classList.remove('depleted'); });
  const keys = Object.keys(keyMap);
  keys.forEach((k, i) => {
    if ($hints[i]) {
      $hints[i].innerHTML = `<span class="key">[${k}]</span> ${keyMap[k]}`;
    }
  });
}

function renderHands() {
  for (const p of [1, 2]) {
    const counts = handCounts(hands[p]);
    for (const spell of SPELLS) {
      const el = document.getElementById(`p${p}-count-${spell}`);
      if (!el) continue;
      const emoji = spell === 'Fireball' ? '🔥' : spell === 'Shield' ? '🛡️' : '💀';
      el.textContent = `${emoji} ×${counts[spell]}`;
      el.classList.toggle('depleted', counts[spell] === 0);
    }
  }
}

function startCountdownBar(durationMs) {
  countdownStart = performance.now();
  countdownDuration = durationMs;
  $countdownBar.style.width = '100%';
  $countdownBar.style.backgroundColor = '#40c040';
  $countdownContainer.style.display = '';

  function tick() {
    if (paused) { rafId = requestAnimationFrame(tick); return; }
    const elapsed = performance.now() - countdownStart;
    const frac = Math.max(0, 1 - elapsed / countdownDuration);
    $countdownBar.style.width = (frac * 100) + '%';

    if (frac > 0.5) $countdownBar.style.backgroundColor = '#40c040';
    else if (frac > 0.25) $countdownBar.style.backgroundColor = '#e0a020';
    else $countdownBar.style.backgroundColor = '#e04040';

    $countdownText.textContent = Math.max(0, (frac * countdownDuration / 1000)).toFixed(1) + 's';

    if (frac > 0) rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);
}

function hideCountdown() {
  $countdownBar.style.width = '0%';
  $countdownText.textContent = '';
}

function showOverlay(text, sub, colour) {
  $overlayText.textContent = text;
  $overlayText.style.color = colour || '#fff';
  $overlaySub.textContent = sub || '';
  $overlay.classList.add('visible');
}

function hideOverlay() {
  $overlay.classList.remove('visible');
}

function flashAvatar(player) {
  const av = player === 1 ? $p1Avatar : $p2Avatar;
  av.classList.remove('flash');
  void av.offsetWidth;
  av.classList.add('flash');
}

// ── Empty hand resolution ─────────────────────────────────────
function resolveEmptyHand(emptyPlayer) {
  clearTimer();
  hideCountdown();
  const scorer = otherPlayer(emptyPlayer);
  flashAvatar(emptyPlayer);
  showOverlay('EMPTY HAND!', `Player ${emptyPlayer} has no spells left`, '#e04040');
  scores[scorer]++;
  renderPips();

  const next = scores[scorer] >= WIN_SCORE ? 'GAME_OVER' : 'NEXT_ROUND';

  if (next === 'GAME_OVER') {
    activeTimer = setTimeout(() => {
      hideOverlay();
      enterState('GAME_OVER');
    }, 1500);
  } else {
    activeTimer = setTimeout(() => {
      hideOverlay();
      round++;
      attacker = Math.random() < 0.5 ? 1 : 2;
      dealHands();
      enterState('ATTACK_PHASE');
    }, 1500);
  }
}

// ── State transitions ─────────────────────────────────────────
function enterState(newState) {
  clearTimer();
  state = newState;

  switch (state) {
    case 'IDLE':
      $spellBanner.textContent = 'ARCANE AKASH';
      $phaseLabel.textContent = 'Press any key to start';
      hideCountdown();
      hideOverlay();
      renderRoles();
      renderPips();
      $hints[0].innerHTML = '<span class="key">[1]</span> Fireball';
      $hints[1].innerHTML = '<span class="key">[2]</span> Shield';
      $hints[2].innerHTML = '<span class="key">[3]</span> Hex';
      break;

    case 'ATTACK_PHASE': {
      attackSpell = null;
      defendSpell = null;
      shuffledKeyMap = null;

      if (isEmpty(hands[attacker])) {
        resolveEmptyHand(attacker);
        return;
      }

      $roundLabel.textContent = 'ROUND ' + round;
      renderRoles();
      renderPips();
      renderHands();
      $spellBanner.textContent = '';
      $phaseLabel.textContent = `PLAYER ${attacker} — ATTACK!`;

      const atkMap = filteredKeyMap(attacker, availableSpells(hands[attacker]));
      renderHints(atkMap);

      const duration = 3000;
      startCountdownBar(duration);
      activeTimer = setTimeout(() => {
        enterState('RESOLVE_FUMBLE');
      }, duration);
      break;
    }

    case 'REVEAL_DELAY': {
      $phaseLabel.textContent = '';
      hideCountdown();
      $spellBanner.textContent = '...';

      const delay = randBetween(200, 600);
      countdownStart = performance.now();
      countdownDuration = delay;
      activeTimer = setTimeout(() => {
        enterState('DEFEND_PHASE');
      }, delay);
      break;
    }

    case 'DEFEND_PHASE': {
      const def = otherPlayer(attacker);

      if (isEmpty(hands[def])) {
        resolveEmptyHand(def);
        return;
      }

      const defAvailable = availableSpells(hands[def]);
      const shuffledSpells = shuffleArray(defAvailable);
      const defKeys = keyListForPlayer(def);
      shuffledKeyMap = {};
      defKeys.slice(0, shuffledSpells.length).forEach((k, i) => {
        shuffledKeyMap[k] = shuffledSpells[i];
      });

      $spellBanner.textContent = `>>> ${attackSpell.toUpperCase()}! >>>`;
      $phaseLabel.textContent = `PLAYER ${def} — DEFEND!`;
      renderHints(shuffledKeyMap);

      const duration = randBetween(1600, 2400);
      startCountdownBar(duration);
      activeTimer = setTimeout(() => {
        defendSpell = null;
        resolve('TIMEOUT');
      }, duration);
      break;
    }

    case 'RESOLVE_FUMBLE':
      $spellBanner.textContent = 'FUMBLE!';
      $phaseLabel.textContent = `Player ${attacker} hesitated`;
      $spellBanner.style.color = '#888';
      hideCountdown();
      showOverlay('FUMBLE!', `Player ${attacker} didn't cast in time`, '#888');
      activeTimer = setTimeout(() => {
        $spellBanner.style.color = '#f0c040';
        hideOverlay();
        attacker = otherPlayer(attacker);
        enterState('ATTACK_PHASE');
      }, 1500);
      break;

    case 'GAME_OVER': {
      const winner = scores[1] >= WIN_SCORE ? 1 : 2;
      hideCountdown();
      renderRoles();
      renderPips();
      $spellBanner.textContent = '';
      $phaseLabel.textContent = '';
      showOverlay(`PLAYER ${winner} WINS!`, 'Press any key to restart', '#f0c040');
      break;
    }

    default:
      break;
  }
}

// ── Spell resolution ──────────────────────────────────────────
function resolve(reason) {
  clearTimer();
  hideCountdown();

  const result = resolveSpells(attackSpell, defendSpell);
  const def = otherPlayer(attacker);

  let text, sub, colour;

  if (reason === 'TIMEOUT') {
    text = 'TIMEOUT!';
    sub = `Player ${def} didn't defend in time`;
    colour = '#e04040';
    flashAvatar(def);
  } else if (result.outcome === 'CLASH') {
    text = 'CLASH!';
    sub = `${attackSpell} vs ${defendSpell}`;
    colour = '#e0a020';
  } else if (result.outcome === 'BLOCKED') {
    text = 'BLOCKED!';
    sub = `${defendSpell} counters ${attackSpell}`;
    colour = '#4080e0';
  } else {
    text = 'HIT!';
    sub = `${attackSpell} breaks through ${defendSpell}`;
    colour = '#e04040';
    flashAvatar(def);
  }

  $spellBanner.textContent = '';
  $phaseLabel.textContent = '';
  showOverlay(text, sub, colour);

  const next = nextStateAfterResolve(result.outcome, scores[attacker], WIN_SCORE);

  if (next.scoreChange) {
    scores[attacker] += next.scoreChange;
    renderPips();
  }

  if (next.next === 'GAME_OVER') {
    activeTimer = setTimeout(() => {
      hideOverlay();
      enterState('GAME_OVER');
    }, 1500);
  } else if (next.next === 'NEXT_ROUND') {
    activeTimer = setTimeout(() => {
      hideOverlay();
      round++;
      attacker = Math.random() < 0.5 ? 1 : 2;
      dealHands();
      enterState('ATTACK_PHASE');
    }, 1500);
  } else {
    activeTimer = setTimeout(() => {
      hideOverlay();
      attacker = otherPlayer(attacker);
      enterState('ATTACK_PHASE');
    }, 1200);
  }
}

// ── Input handling ────────────────────────────────────────────
const HANDLERS = {
  IDLE(_key) {
    scores = { 1: 0, 2: 0 };
    round = 1;
    attacker = Math.random() < 0.5 ? 1 : 2;
    dealHands();
    enterState('ATTACK_PHASE');
  },

  ATTACK_PHASE(key) {
    const atkMap = filteredKeyMap(attacker, availableSpells(hands[attacker]));
    if (!(key in atkMap)) return;
    attackSpell = atkMap[key];
    hands[attacker] = spendCard(hands[attacker], attackSpell);
    renderHands();
    enterState('REVEAL_DELAY');
  },

  DEFEND_PHASE(key) {
    if (defendSpell !== null) return;
    if (!shuffledKeyMap || !(key in shuffledKeyMap)) return;
    defendSpell = shuffledKeyMap[key];
    const def = otherPlayer(attacker);
    hands[def] = spendCard(hands[def], defendSpell);
    renderHands();
    resolve('CAST');
  },

  GAME_OVER(_key) {
    enterState('IDLE');
  },
};

window.addEventListener('keydown', (e) => {
  if (paused) return;
  const handler = HANDLERS[state];
  if (handler) handler(e.key);
});

// ── Visibility (pause/resume) ─────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (state === 'ATTACK_PHASE' || state === 'DEFEND_PHASE' || state === 'REVEAL_DELAY') {
      paused = true;
      $pausedOverlay.classList.add('visible');
      if (activeTimer !== null) {
        pausedRemaining = Math.max(0, countdownDuration - (performance.now() - countdownStart));
        clearTimeout(activeTimer);
        activeTimer = null;
      }
    }
  } else if (paused) {
    paused = false;
    $pausedOverlay.classList.remove('visible');
    if (pausedRemaining > 0) {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      countdownStart = performance.now();
      countdownDuration = pausedRemaining;
      if (state === 'ATTACK_PHASE' || state === 'DEFEND_PHASE') {
        startCountdownBar(pausedRemaining);
      }
      if (state === 'ATTACK_PHASE') {
        activeTimer = setTimeout(() => enterState('RESOLVE_FUMBLE'), pausedRemaining);
      } else if (state === 'DEFEND_PHASE') {
        activeTimer = setTimeout(() => { defendSpell = null; resolve('TIMEOUT'); }, pausedRemaining);
      } else if (state === 'REVEAL_DELAY') {
        activeTimer = setTimeout(() => enterState('DEFEND_PHASE'), pausedRemaining);
      }
    }
  }
});

// ── Init ──────────────────────────────────────────────────────
enterState('IDLE');
```

- [ ] **Step 2: Build and verify no bundle errors**

```bash
npm run build:mvp2 2>&1
```

Expected: output `mvp2/bundle.js` with no errors.

- [ ] **Step 3: Run all tests**

```bash
npm test 2>&1 | tail -15
```

Expected: All test suites pass.

- [ ] **Step 4: Commit**

```bash
git add mvp2/js/game.js mvp2/bundle.js
git commit -m "feat(mvp2): integrate hand system into game loop"
```

---

## Task 7: Smoke test and verify in browser

**Files:** none

- [ ] **Step 1: Open `mvp2/index.html` in browser**

Open `file:///path/to/LIT-intelligence/mvp2/index.html` directly, or serve with:

```bash
npx serve . -p 3001
```

Then navigate to `http://localhost:3001/mvp2/`.

- [ ] **Step 2: Verify hand panels appear**

Both side panels visible with 🔥×0 🛡️×0 💀×0 on IDLE screen.

- [ ] **Step 3: Start game and verify hand counts update**

Press any key — hand panels should update to show 5 cards dealt (sum = 5 per player). Counts must be non-zero for at least 2 spell types per player.

- [ ] **Step 4: Verify card spend on attack**

Press an attack key. Confirm the attacker's count for that spell type decrements in the side panel.

- [ ] **Step 5: Verify defend key hints show only available spells**

Confirm the footer key legend only shows spells the defender has remaining. If Shield is depleted, no Shield hint appears.

- [ ] **Step 6: Verify depleted spells are struck through in side panel**

When a count hits 0, confirm that row becomes dimmed/struck-through in the hand panel.

- [ ] **Step 7: Commit**

No code changes in this task — if everything looks good, just tag it:

```bash
git commit --allow-empty -m "chore(mvp2): smoke test passed"
```

---

## Self-Review Checklist

After implementing all tasks, verify these spec requirements are covered:

| Spec requirement | Task |
|---|---|
| 5 cards per player per round | Task 2 (`dealHand` returns 5) |
| Random deal from 15-card pool (5×F, 5×S, 5×H) | Task 2 (`FULL_DECK`) |
| Cards deplete on use (attack and defend) | Task 6 (`spendCard` in handlers) |
| Fresh hand each round | Task 6 (`dealHands()` in NEXT_ROUND transition) |
| Opponent counts visible (side panels) | Tasks 4, 5, 6 (`renderHands`) |
| Depleted types dimmed | Task 5 (`.depleted` CSS), Task 6 (`renderHands`) |
| Disabled keys for depleted spells | Task 6 (`filteredKeyMap` in handlers) |
| Defend shuffle only on available spells | Task 6 (DEFEND_PHASE setup) |
| Empty hand = auto hit against that player | Task 6 (`resolveEmptyHand`) |
| Empty hand checked at start of attack AND defend phase | Task 6 (`isEmpty` checks in `enterState`) |

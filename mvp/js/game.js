import { START_HEALTH, CHAOS, SLOT_DEFAULTS } from './constants.js';
import { randBetween, otherPlayer, keyListForPlayer, playerForKey } from './utils.js';
import { resolveSpells, nextStateAfterResolve } from './resolution.js';

// ── Game state ────────────────────────────────────────────────
let state = 'IDLE';
let activeTimer = null;
let rafId = null;
let health = { 1: START_HEALTH, 2: START_HEALTH };
let round = 1;
let attacker = 1;
let attackSpell = null;
let attackSlotIndex = null;
let defendSpell = null;
let defendSlotIndex = null;
let countdownStart = 0;
let countdownDuration = 0;
let paused = false;
let pausedRemaining = 0;
let misfireCount = { 1: 0, 2: 0 };
let pendingMorphEvents = [];
let pendingNextState = null;

// ── Spell slot state ─────────────────────────────────────────
let playerSlots = { 1: [...SLOT_DEFAULTS], 2: [...SLOT_DEFAULTS] };

function resetAllSlots() {
  playerSlots[1] = [...SLOT_DEFAULTS];
  playerSlots[2] = [...SLOT_DEFAULTS];
}

function morphSlot(player, slotIndex, spell) {
  playerSlots[player][slotIndex] = spell;
}

function slotKeyMap(player) {
  const keys = keyListForPlayer(player);
  const map = {};
  keys.forEach((k, i) => { map[k] = playerSlots[player][i]; });
  return map;
}

function slotIndexForKey(player, key) {
  const keys = keyListForPlayer(player);
  return keys.indexOf(key);
}

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
const $slots = {
  1: [document.getElementById('p1-slot-0'), document.getElementById('p1-slot-1'), document.getElementById('p1-slot-2')],
  2: [document.getElementById('p2-slot-0'), document.getElementById('p2-slot-1'), document.getElementById('p2-slot-2')],
};
const $p1Panel = document.getElementById('p1-panel');
const $p2Panel = document.getElementById('p2-panel');
const $instructionBar = document.getElementById('instruction-bar');

// ── Utility ───────────────────────────────────────────────────
function clearTimer() {
  if (activeTimer !== null) { clearTimeout(activeTimer); activeTimer = null; }
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}

// ── Rendering ─────────────────────────────────────────────────
function renderPips() {
  for (let p = 1; p <= 2; p++) {
    for (let i = 0; i < 3; i++) {
      const pip = document.getElementById(`p${p}-pip-${i}`);
      pip.classList.toggle('filled', i < health[p]);
    }
  }
}

function renderRoles() {
  const atkCol = attacker === 1 ? $p1Col : $p2Col;
  const defCol = attacker === 1 ? $p2Col : $p1Col;
  const atkRole = attacker === 1 ? $p1Role : $p2Role;
  const defRole = attacker === 1 ? $p2Role : $p1Role;
  const atkPanel = attacker === 1 ? $p1Panel : $p2Panel;
  const defPanel = attacker === 1 ? $p2Panel : $p1Panel;

  $p1Col.classList.remove('attacker', 'defender', 'inactive');
  $p2Col.classList.remove('attacker', 'defender', 'inactive');
  $p1Panel.classList.remove('inactive');
  $p2Panel.classList.remove('inactive');

  if (state === 'IDLE' || state === 'GAME_OVER') {
    atkRole.textContent = '';
    defRole.textContent = '';
    return;
  }

  atkCol.classList.add('attacker');
  defCol.classList.add('defender');
  defCol.classList.add('inactive');
  defPanel.classList.add('inactive');
  atkRole.textContent = 'attacker';
  defRole.textContent = 'defender';

  // Swap visual emphasis during defend phase
  if (state === 'DEFEND_PHASE') {
    atkCol.classList.add('inactive');
    atkPanel.classList.add('inactive');
    defCol.classList.remove('inactive');
    defPanel.classList.remove('inactive');
  }
}

const SPELL_EMOJI = { Fireball: '🔥', Shield: '🛡', Hex: '💀', Chaos: '🌀' };

function renderSlots() {
  for (let p = 1; p <= 2; p++) {
    const keys = keyListForPlayer(p);
    for (let i = 0; i < 3; i++) {
      const spell = playerSlots[p][i];
      const el = $slots[p][i];
      const emoji = SPELL_EMOJI[spell] || '❓';
      el.innerHTML = `<span class="key">[${keys[i]}]</span> <span class="slot-name">${spell}</span> <span class="slot-emoji">${emoji}</span>`;
      el.classList.toggle('chaos', spell === CHAOS);
    }
  }
}

function renderInstructionBar() {
  const EMOJI = { Fireball: '🔥', Shield: '🛡', Hex: '💀', Chaos: '❓' };
  function slotLabel(player) {
    const keys = keyListForPlayer(player);
    return keys.map((k, i) => {
      const spell = playerSlots[player][i];
      return `[${k}] ${spell} ${EMOJI[spell] || '❓'}`;
    }).join('  ');
  }

  switch (state) {
    case 'IDLE':
      $instructionBar.textContent = 'Press SPACE to begin the duel';
      break;
    case 'ATTACK_PHASE':
      $instructionBar.textContent = `P${attacker}: Cast → ${slotLabel(attacker)}`;
      break;
    case 'DEFEND_PHASE': {
      const def = otherPlayer(attacker);
      $instructionBar.textContent = `P${def}: Counter ${attackSpell.toUpperCase()} → ${slotLabel(def)}`;
      break;
    }
    case 'GAME_OVER':
      $instructionBar.textContent = 'Press SPACE to play again';
      break;
    default:
      $instructionBar.textContent = '';
      break;
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

    if (frac > 0) {
      rafId = requestAnimationFrame(tick);
    }
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

function showMorphFeedback(events) {
  for (const { player, slot, type, label } of events) {
    const el = $slots[player][slot];
    // Remove previous animation classes
    el.classList.remove('morph-degrade', 'morph-restore');
    void el.offsetWidth; // force reflow for re-trigger
    el.classList.add(type === 'restore' ? 'morph-restore' : 'morph-degrade');

    // Add cause label
    const labelEl = document.createElement('span');
    labelEl.className = `morph-label ${type}`;
    labelEl.textContent = label;
    el.appendChild(labelEl);

    // Auto-remove after animation
    setTimeout(() => {
      labelEl.remove();
      el.classList.remove('morph-degrade', 'morph-restore');
    }, 1500);
  }
}

function flashAvatar(player) {
  const av = player === 1 ? $p1Avatar : $p2Avatar;
  av.classList.remove('flash');
  void av.offsetWidth; // force reflow
  av.classList.add('flash');
}

function flashColumn(player, cssClass) {
  const col = player === 1 ? $p1Col : $p2Col;
  col.classList.remove(cssClass);
  void col.offsetWidth;
  col.classList.add(cssClass);
}

function showCommitLabel(player) {
  const col = player === 1 ? $p1Col : $p2Col;
  const el = document.createElement('div');
  el.className = 'commit-label';
  el.textContent = '✦ LOCKED IN';
  col.appendChild(el);
  setTimeout(() => el.remove(), 500);
}

function shatterPip(player, pipIndex) {
  const pip = document.getElementById(`p${player}-pip-${pipIndex}`);
  pip.classList.remove('shatter');
  void pip.offsetWidth;
  pip.classList.add('shatter');
  flashColumn(player, 'flash-hit');
}

function showBackfireWarning(player) {
  const col = player === 1 ? $p1Col : $p2Col;
  const el = document.createElement('div');
  el.className = 'fizzle-label warning';
  el.textContent = 'Careful!';
  col.appendChild(el);
  setTimeout(() => el.remove(), 800);
  flashAvatar(player);
}

function triggerBackfire(player) {
  if (health[player] <= 0) return;
  health[player] -= 1;
  renderPips();
  shatterPip(player, health[player]);
  flashAvatar(player);
  flashColumn(player, 'flash-backfire');

  const col = player === 1 ? $p1Col : $p2Col;
  const el = document.createElement('div');
  el.className = 'backfire-label';
  el.textContent = 'BACKFIRE!';
  col.appendChild(el);
  setTimeout(() => el.remove(), 1000);

  if (health[player] <= 0) {
    clearTimer();
    enterState('GAME_OVER');
  }
}

// ── State transitions ─────────────────────────────────────────
function advanceFromMorph() {
  $phaseLabel.style.color = '#ccc';
  const ns = pendingNextState;
  pendingNextState = null;
  pendingMorphEvents = [];
  if (ns === 'GAME_OVER') {
    enterState('GAME_OVER');
  } else if (ns === 'NEXT_ROUND') {
    round++;
    attacker = Math.random() < 0.5 ? 1 : 2;
    resetAllSlots();
    enterState('ATTACK_PHASE');
  } else {
    attacker = otherPlayer(attacker);
    enterState('ATTACK_PHASE');
  }
}

function enterState(newState) {
  clearTimer();
  state = newState;

  switch (state) {
    case 'IDLE':
      $spellBanner.textContent = 'ARCANE AKASH';
      $phaseLabel.textContent = '';
      hideCountdown();
      hideOverlay();
      renderRoles();
      renderPips();
      renderSlots();
      renderInstructionBar();
      break;

    case 'ATTACK_PHASE': {
      misfireCount = { 1: 0, 2: 0 };
      attackSpell = null;
      attackSlotIndex = null;
      defendSpell = null;
      defendSlotIndex = null;
      $roundLabel.textContent = 'ROUND ' + round;
      renderRoles();
      renderPips();
      $spellBanner.textContent = '';
      $phaseLabel.textContent = `P${attacker} ⚔️ ATTACK`;

      renderSlots();
      renderInstructionBar();

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
      misfireCount = { 1: 0, 2: 0 };
      const def = otherPlayer(attacker);

      $spellBanner.textContent = `>>> ${attackSpell.toUpperCase()}! >>>`;
      $phaseLabel.textContent = `P${def} 🛡 DEFEND`;
      renderRoles();
      renderSlots();
      renderInstructionBar();

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

    case 'MORPH_DISPLAY': {
      hideOverlay();
      $spellBanner.textContent = '';
      $phaseLabel.textContent = 'SPELLS SHIFTING...';
      $phaseLabel.style.color = '#c090ff';
      renderSlots();
      showMorphFeedback(pendingMorphEvents);
      renderInstructionBar();

      const morphDuration = 1500;
      countdownStart = performance.now();
      countdownDuration = morphDuration;
      activeTimer = setTimeout(advanceFromMorph, morphDuration);
      break;
    }

    case 'GAME_OVER': {
      const winner = health[1] <= 0 ? 2 : 1;
      hideCountdown();
      renderRoles();
      renderPips();
      $spellBanner.textContent = '';
      $phaseLabel.textContent = '';
      showOverlay(`PLAYER ${winner} WINS!`, '', '#f0c040');
      renderInstructionBar();
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

  const next = nextStateAfterResolve(result.outcome, health[def]);

  if (next.healthChange) {
    const oldHealth = health[def];
    health[def] += next.healthChange;
    renderPips();
    // Shatter the pip that was just lost
    if (health[def] < oldHealth) {
      shatterPip(def, health[def]);
    }
  }

  // Morph-on-cast: attacker's used slot degrades or resets
  const morphEvents = [];
  if (attackSlotIndex !== null) {
    if (playerSlots[attacker][attackSlotIndex] === CHAOS) {
      morphSlot(attacker, attackSlotIndex, SLOT_DEFAULTS[attackSlotIndex]);
      morphEvents.push({ player: attacker, slot: attackSlotIndex, type: 'restore', label: 'CAST → RESTORED!' });
    } else {
      morphSlot(attacker, attackSlotIndex, CHAOS);
      morphEvents.push({ player: attacker, slot: attackSlotIndex, type: 'degrade', label: 'CAST → CHAOS' });
    }
  }

  // Morph-on-hit: defender loses a random Standard slot
  if (result.outcome === 'HIT' || reason === 'TIMEOUT') {
    const standardSlots = playerSlots[def]
      .map((spell, i) => spell !== CHAOS ? i : -1)
      .filter(i => i >= 0);
    if (standardSlots.length > 0) {
      const pick = standardSlots[Math.floor(Math.random() * standardSlots.length)];
      morphSlot(def, pick, CHAOS);
      morphEvents.push({ player: def, slot: pick, type: 'degrade', label: 'HIT → CHAOS' });
    }
  }

  renderSlots();

  // Store morph events and next-state decision for MORPH_DISPLAY
  pendingMorphEvents = morphEvents;
  pendingNextState = next.next;

  // Show overlay for 1.2s, then transition to MORPH_DISPLAY (or skip if no morph events)
  const overlayDuration = 1200;
  activeTimer = setTimeout(() => {
    if (morphEvents.length > 0) {
      enterState('MORPH_DISPLAY');
    } else {
      hideOverlay();
      advanceFromMorph();
    }
  }, overlayDuration);
}

// ── Input handling ────────────────────────────────────────────
const HANDLERS = {
  IDLE(key) {
    if (key !== ' ') return;
    health = { 1: START_HEALTH, 2: START_HEALTH };
    round = 1;
    attacker = Math.random() < 0.5 ? 1 : 2;
    resetAllSlots();
    enterState('ATTACK_PHASE');
  },

  ATTACK_PHASE(key) {
    const atkMap = slotKeyMap(attacker);
    if (!(key in atkMap)) return;
    attackSlotIndex = slotIndexForKey(attacker, key);
    attackSpell = atkMap[key];
    flashColumn(attacker, 'flash-commit');
    showCommitLabel(attacker);
    enterState('REVEAL_DELAY');
  },

  DEFEND_PHASE(key) {
    if (defendSpell !== null) return;
    const def = otherPlayer(attacker);
    const defMap = slotKeyMap(def);
    if (!(key in defMap)) return;
    defendSlotIndex = slotIndexForKey(def, key);
    defendSpell = defMap[key];
    flashColumn(def, 'flash-commit');
    showCommitLabel(def);
    resolve('CAST');
  },

  GAME_OVER(key) {
    if (key !== ' ') return;
    enterState('IDLE');
  },
};

window.addEventListener('keydown', (e) => {
  if (paused) return;
  const key = e.key;
  const keyOwner = playerForKey(key);

  // Determine the active player for the current state
  const activePlayer =
    (state === 'ATTACK_PHASE') ? attacker :
    (state === 'DEFEND_PHASE') ? otherPlayer(attacker) :
    null;

  // During active phases, non-active player's keys trigger backfire
  if (activePlayer !== null && keyOwner !== null && keyOwner !== activePlayer) {
    misfireCount[keyOwner] += 1;
    if (misfireCount[keyOwner] === 1) {
      showBackfireWarning(keyOwner);
    } else {
      triggerBackfire(keyOwner);
    }
    return;
  }

  const handler = HANDLERS[state];
  if (handler) handler(key);
});

// ── Visibility (pause/resume) ─────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (state === 'ATTACK_PHASE' || state === 'DEFEND_PHASE' || state === 'REVEAL_DELAY' || state === 'MORPH_DISPLAY') {
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
      } else if (state === 'MORPH_DISPLAY') {
        activeTimer = setTimeout(advanceFromMorph, pausedRemaining);
      }
    }
  }
});

// ── Init ──────────────────────────────────────────────────────
enterState('IDLE');

import { SPELLS, WIN_SCORE } from './constants.js';
import { randBetween, shuffleArray, otherPlayer, keysForPlayer, keyListForPlayer } from './utils.js';
import { resolveSpells, nextStateAfterResolve } from './resolution.js';

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
  const keys = Object.keys(keyMap);
  keys.forEach((k, i) => {
    $hints[i].innerHTML = `<span class="key">[${k}]</span> ${keyMap[k]}`;
  });
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

function flashAvatar(player) {
  const av = player === 1 ? $p1Avatar : $p2Avatar;
  av.classList.remove('flash');
  void av.offsetWidth; // force reflow
  av.classList.add('flash');
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
      $roundLabel.textContent = 'ROUND ' + round;
      renderRoles();
      renderPips();
      $spellBanner.textContent = '';
      $phaseLabel.textContent = `PLAYER ${attacker} — ATTACK!`;

      const atkKeys = keysForPlayer(attacker);
      renderHints(atkKeys);

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
      const defKeys = keyListForPlayer(def);
      const shuffledSpells = shuffleArray(SPELLS);
      shuffledKeyMap = {};
      defKeys.forEach((k, i) => { shuffledKeyMap[k] = shuffledSpells[i]; });

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
      enterState('ATTACK_PHASE');
    }, 1500);
  } else {
    // SWAP — roles swap, continue
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
    enterState('ATTACK_PHASE');
  },

  ATTACK_PHASE(key) {
    const atkKeys = keysForPlayer(attacker);
    if (!(key in atkKeys)) return;
    attackSpell = atkKeys[key];
    enterState('REVEAL_DELAY');
  },

  DEFEND_PHASE(key) {
    if (defendSpell !== null) return;
    if (!shuffledKeyMap || !(key in shuffledKeyMap)) return;
    defendSpell = shuffledKeyMap[key];
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

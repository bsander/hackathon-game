import {
  PRESSURE_THRESHOLD, START_HEALTH, COOLDOWN_MS,
  COUNTDOWN_SECS, PAUSE_BETWEEN_ROUNDS_MS,
  ingredientForKey,
} from './constants.js';
import {
  freshRoundState, applyIngredient, checkReaction,
  applyReaction, checkExplosion,
} from './ingredients.js';

// ── Game state ────────────────────────────────────────────────
let gameState = 'IDLE';       // IDLE | COUNTDOWN | ROUND_ACTIVE | EXPLODING | ROUND_PAUSE | GAME_OVER
let health = { 1: START_HEALTH, 2: START_HEALTH };
let round = 1;
let cauldron = freshRoundState();
let lastPress = { 1: null, 2: null };   // { ingredient, time }
let cooldownUntil = { 1: 0, 2: 0 };
let countdownRemaining = 0;
let countdownTimer = null;
let reactionTimeout = null;

// ── DOM refs ──────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $game = $('game');
const $roundLabel = $('round-label');
const $overlay = $('overlay');
const $overlayText = $('overlay-text');
const $overlaySub = $('overlay-sub');
const $directionFill = $('direction-fill');
const $directionMarker = $('direction-marker');
const $pressureFill = $('pressure-fill');
const $cauldron = $('cauldron');
const $cauldronEmoji = $('cauldron-emoji');
const $reactionLabel = $('reaction-label');
const $p1Brew = $('p1-brew');
const $p2Brew = $('p2-brew');

// ── Rendering ─────────────────────────────────────────────────

function renderPips() {
  for (let p = 1; p <= 2; p++) {
    const prefix = p === 1 ? 'p1' : 'p2';
    for (let i = 0; i < START_HEALTH; i++) {
      const pip = $(`${prefix}-pip-${i}`);
      if (i < health[p]) {
        pip.classList.remove('lost');
        pip.textContent = '♥';
      } else {
        pip.classList.add('lost');
        pip.textContent = '♡';
      }
    }
  }
}

function renderDirection() {
  const dir = cauldron.direction;
  // Marker position: direction 0 = 50%, -10 = 0%, +10 = 100%
  const pct = ((dir + 10) / 20) * 100;
  $directionMarker.style.left = `${pct}%`;

  // Fill bar
  $directionFill.className = '';
  if (dir < 0) {
    $directionFill.classList.add('p1-danger');
    $directionFill.style.width = `${(Math.abs(dir) / 10) * 50}%`;
    $directionFill.style.right = '';
    $directionFill.style.left = '0';
  } else if (dir > 0) {
    $directionFill.classList.add('p2-danger');
    $directionFill.style.width = `${(dir / 10) * 50}%`;
    $directionFill.style.left = '';
    $directionFill.style.right = '0';
  } else {
    $directionFill.style.width = '0%';
  }
}

function renderPressure() {
  const pct = Math.min(100, (cauldron.pressure / PRESSURE_THRESHOLD) * 100);
  $pressureFill.style.width = `${pct}%`;

  // Cauldron visual intensity
  $cauldron.classList.remove('hot', 'critical');
  if (pct >= 80) $cauldron.classList.add('critical');
  else if (pct >= 50) $cauldron.classList.add('hot');

  // Cauldron emoji reflects intensity
  if (pct >= 80) $cauldronEmoji.textContent = '💥';
  else if (pct >= 50) $cauldronEmoji.textContent = '🔥';
  else if (pct >= 20) $cauldronEmoji.textContent = '🫧';
  else $cauldronEmoji.textContent = '🪄';
}

function renderBrew() {
  $p1Brew.className = 'brew-indicator';
  $p2Brew.className = 'brew-indicator';
  if (cauldron.brewStacks[1] >= 2) $p1Brew.classList.add('glow-2');
  else if (cauldron.brewStacks[1] === 1) $p1Brew.classList.add('glow-1');
  if (cauldron.brewStacks[2] >= 2) $p2Brew.classList.add('glow-2');
  else if (cauldron.brewStacks[2] === 1) $p2Brew.classList.add('glow-1');
}

function renderAll() {
  renderPips();
  renderDirection();
  renderPressure();
  renderBrew();
  $roundLabel.textContent = `ROUND ${round}`;
}

function showReaction(name) {
  const labels = {
    counter: 'COUNTERED!',
    clash: 'CLASH!',
    deflect: 'DEFLECTED!',
    stall: 'STALL!',
    chaos: 'CHAOS!',
    cancel: 'CANCELLED!',
  };
  $reactionLabel.textContent = labels[name] || name.toUpperCase();
  $reactionLabel.classList.remove('visible');
  // Force reflow to restart animation
  void $reactionLabel.offsetWidth;
  $reactionLabel.classList.add('visible');

  clearTimeout(reactionTimeout);
  reactionTimeout = setTimeout(() => {
    $reactionLabel.classList.remove('visible');
  }, 1000);
}

function flashKeyRow(key) {
  const row = document.querySelector(`.key-row[data-key="${key}"]`);
  if (!row) return;
  row.classList.add('pressed');
  setTimeout(() => row.classList.remove('pressed'), 150);
}

// ── Overlay ───────────────────────────────────────────────────

function showOverlay(text, sub) {
  $overlayText.textContent = text;
  $overlaySub.textContent = sub || '';
  $overlay.classList.remove('hidden');
}

function hideOverlay() {
  $overlay.classList.add('hidden');
}

// ── State machine ─────────────────────────────────────────────

function enterState(newState) {
  gameState = newState;

  switch (newState) {
    case 'IDLE':
      showOverlay('CAULDRON TUG-OF-WAR', 'Press any key to start');
      renderAll();
      break;

    case 'COUNTDOWN':
      hideOverlay();
      cauldron = freshRoundState();
      lastPress = { 1: null, 2: null };
      countdownRemaining = COUNTDOWN_SECS;
      renderAll();
      showOverlay(String(countdownRemaining), '');
      countdownTimer = setInterval(() => {
        countdownRemaining--;
        if (countdownRemaining > 0) {
          showOverlay(String(countdownRemaining), '');
        } else {
          clearInterval(countdownTimer);
          enterState('ROUND_ACTIVE');
        }
      }, 1000);
      break;

    case 'ROUND_ACTIVE':
      hideOverlay();
      renderAll();
      break;

    case 'EXPLODING': {
      const result = checkExplosion(cauldron);
      if (!result.exploded) {
        enterState('ROUND_ACTIVE');
        return;
      }
      $game.classList.add('exploding');
      health[result.loser]--;
      const loserLabel = `P${result.loser}`;

      // Shatter the lost pip
      const pipIdx = health[result.loser]; // after decrement, this is the index of the lost pip
      const pipEl = $(`p${result.loser}-pip-${pipIdx}`);
      if (pipEl) pipEl.classList.add('shatter');

      renderPips();
      showOverlay('BOOM!', `${loserLabel} takes damage!`);

      setTimeout(() => {
        $game.classList.remove('exploding');
        if (pipEl) pipEl.classList.remove('shatter');

        if (health[result.loser] <= 0) {
          const winner = result.loser === 1 ? 2 : 1;
          enterState('GAME_OVER');
          showOverlay(`P${winner} WINS!`, 'Press any key to play again');
        } else {
          enterState('ROUND_PAUSE');
        }
      }, PAUSE_BETWEEN_ROUNDS_MS);
      break;
    }

    case 'ROUND_PAUSE':
      round++;
      setTimeout(() => {
        enterState('COUNTDOWN');
      }, 500);
      break;

    case 'GAME_OVER':
      // Overlay already shown from EXPLODING
      break;
  }
}

// ── Input handling ────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  // Start / restart
  if (gameState === 'IDLE' || gameState === 'GAME_OVER') {
    health = { 1: START_HEALTH, 2: START_HEALTH };
    round = 1;
    enterState('COUNTDOWN');
    return;
  }

  if (gameState !== 'ROUND_ACTIVE') return;

  const mapping = ingredientForKey(e.key);
  if (!mapping) return;

  const { player, ingredient } = mapping;
  const now = performance.now();

  // Cooldown check
  if (now < cooldownUntil[player]) return;
  cooldownUntil[player] = now + COOLDOWN_MS;

  // Flash the key
  flashKeyRow(e.key);

  // Apply ingredient
  cauldron = applyIngredient(cauldron, player, ingredient);

  // Check for cross-player reaction
  const otherPlayer = player === 1 ? 2 : 1;
  const thisPress = { ingredient, time: now };
  const reaction = checkReaction(lastPress[otherPlayer], thisPress);
  if (reaction) {
    cauldron = applyReaction(cauldron, reaction, player);
    showReaction(reaction);
    // Clear last presses so the same pair can't re-trigger
    lastPress[1] = null;
    lastPress[2] = null;
  } else {
    lastPress[player] = thisPress;
  }

  renderAll();

  // Check explosion
  const explosion = checkExplosion(cauldron);
  if (explosion.exploded) {
    enterState('EXPLODING');
  }
});

// ── Init ──────────────────────────────────────────────────────
enterState('IDLE');

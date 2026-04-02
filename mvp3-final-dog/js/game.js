import {
  PRESSURE_THRESHOLD, START_HEALTH, COOLDOWN_MS, FIREBALL_COOLDOWN_MS,
  COUNTDOWN_SECS, PAUSE_BETWEEN_ROUNDS_MS,
  ingredientForKey, getRandomKeyBinding, randomizeOneKey, INGREDIENT_ORDER,
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
let onboardingScreen = 1;     // 1 = intro, 2 = twist explanation
let currentKeyBindings = getRandomKeyBinding();

// ── DOM refs ──────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $game = $('game');
const $roundLabel = $('round-label');
const $overlay = $('overlay');
const $overlayText = $('overlay-text');
const $overlaySub = $('overlay-sub');
const $pressureFill = $('pressure-fill');
const $cauldron = $('cauldron');
const $cauldronEmoji = $('cauldron-emoji');
const $cauldronArrow = $('cauldron-arrow');
const $reactionLabel = $('reaction-label');
const $p1Brew = $('p1-brew');
const $p2Brew = $('p2-brew');
const $hintBanner = $('hint-banner');
const $centre = $('centre');

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

  // Cauldron arrow — shows which way the explosion will go
  if (dir < 0) {
    $cauldronArrow.textContent = '←';
    $cauldronArrow.className = 'arrow-active arrow-p1';
  } else if (dir > 0) {
    $cauldronArrow.textContent = '→';
    $cauldronArrow.className = 'arrow-active arrow-p2';
  } else {
    $cauldronArrow.textContent = '⚖';
    $cauldronArrow.className = 'arrow-active arrow-neutral';
  }

  // Danger colouring on pips at extreme direction
  const dangerThreshold = 7;
  for (let p = 1; p <= 2; p++) {
    for (let i = 0; i < START_HEALTH; i++) {
      const pip = $(`p${p}-pip-${i}`);
      // P1 is in danger when direction < -threshold, P2 when > threshold
      const inDanger = (p === 1 && dir <= -dangerThreshold) ||
                       (p === 2 && dir >= dangerThreshold);
      pip.classList.toggle('danger', inDanger);
    }
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
    counter: 'COUNTERED! — direction negated',
    clash: 'CLASH! — directions cancel, +6 pressure',
    deflect: 'DEFLECTED! — scald reversed at caster',
    stall: 'STALL! — pressure reduced',
    chaos: 'CHAOS! — direction randomised',
    cancel: 'CANCELLED! — brew stacks reset',
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

function updateKeyRowsDisplay() {
  for (let player = 1; player <= 2; player++) {
    const keys = player === 1 ? currentKeyBindings.p1 : currentKeyBindings.p2;
    const prefix = player === 1 ? 'p1' : 'p2';
    const controlsEl = $(`${prefix}-controls`);

    // Get all key-row elements within this player's controls
    const rows = controlsEl.querySelectorAll('.key-row');
    for (let i = 0; i < INGREDIENT_ORDER.length && i < rows.length; i++) {
      const key = keys[i];
      const row = rows[i];
      // Update the key display
      const keyEl = row.querySelector('.key');
      if (keyEl) keyEl.textContent = key;
      // Update data-key for finding during flash
      row.dataset.key = key;
    }
  }
}

function flashKeyRow(key) {
  const row = document.querySelector(`.key-row[data-key="${key}"]`);
  if (!row) return;
  row.classList.add('pressed');
  setTimeout(() => row.classList.remove('pressed'), 150);
}

// ── Floating delta labels ─────────────────────────────────

function getDeltaText(ingredient, player) {
  const arrow = player === 1 ? '→' : '←';
  switch (ingredient) {
    case 'scald': return `+3 pressure, direction ${arrow}`;
    case 'cool': return '−1 pressure';
    case 'swirl': return 'direction reversed!';
    case 'boost': return '+1 brew charge';
    default: return null;
  }
}

let activeLabel = { 1: null, 2: null };

function spawnFloatingLabel(ingredient, player) {
  // Remove previous label for this player
  if (activeLabel[player]) {
    activeLabel[player].remove();
    activeLabel[player] = null;
  }

  const text = getDeltaText(ingredient, player);
  if (!text) return;

  const el = document.createElement('div');
  el.className = `floating-delta p${player}-delta`;
  el.textContent = text;
  $centre.appendChild(el);
  activeLabel[player] = el;

  el.addEventListener('animationend', () => {
    el.remove();
    if (activeLabel[player] === el) activeLabel[player] = null;
  });
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

function showOnboarding() {
  if (onboardingScreen === 1) {
    // Screen 1: Core mechanic
    $overlayText.innerHTML = 'CAULDRON TUG-OF-WAR';
    $overlaySub.innerHTML = [
      '<div class="onboarding">',
      '<p class="onboarding-concept">Two brewers. One cauldron. Toss ingredients to build pressure — when it blows, the <strong>arrow</strong> decides who takes the blast.</p>',
      '<p class="onboarding-concept">Push the explosion toward your opponent. Reverse it when it points at you.</p>',
      '<div class="onboarding-ingredients">',
      '<span>🔥 <strong>Scald</strong> — big pressure push, slow recharge</span>',
      '<span>🧊 <strong>Cool</strong> — reduces pressure</span>',
      '<span>🌀 <strong>Swirl</strong> — reverses the arrow</span>',
      '<span>✨ <strong>Boost</strong> — charges your next spell</span>',
      '</div>',
      '<p class="onboarding-concept onboarding-tip">What happens also depends on what your opponent throws in — expect some mayhem!</p>',
      '<p class="onboarding-concept onboarding-hint">Keys are shown on screen and shuffle after each press.</p>',
      '<p class="onboarding-start">Press SPACE to continue</p>',
      '</div>',
    ].join('');
  } else if (onboardingScreen === 2) {
    // Screen 2: Key randomization twist
    $overlayText.innerHTML = 'THE TWIST';
    $overlaySub.innerHTML = [
      '<div class="onboarding">',
      '<p class="onboarding-concept">Keys shift every time you press! Find your next key before acting.</p>',
      '<p class="onboarding-available-title">Available keys:</p>',
      '<div class="onboarding-keyboard">',
      '<div class="kb-row">',
      '1234567890'.split('').map(k => `<span class="onboarding-key-item">${k}</span>`).join(''),
      '</div>',
      '<div class="kb-row kb-row-offset-1">',
      'qwertyuiop'.split('').map(k => `<span class="onboarding-key-item">${k}</span>`).join(''),
      '</div>',
      '<div class="kb-row kb-row-offset-2">',
      'asdfghjkl'.split('').map(k => `<span class="onboarding-key-item">${k}</span>`).join(''),
      '</div>',
      '<div class="kb-row kb-row-offset-3">',
      'zxcvbnm'.split('').map(k => `<span class="onboarding-key-item">${k}</span>`).join(''),
      '</div>',
      '</div>',
      '<p class="onboarding-start">Press SPACE to start</p>',
      '</div>',
    ].join('');
  }
  $overlay.classList.remove('hidden');
}

// ── State machine ─────────────────────────────────────────────

function enterState(newState) {
  gameState = newState;

  switch (newState) {
    case 'IDLE':
      showOnboarding();
      renderAll();
      break;

    case 'COUNTDOWN':
      hideOverlay();
      cauldron = freshRoundState();
      lastPress = { 1: null, 2: null };
      currentKeyBindings = getRandomKeyBinding();
      updateKeyRowsDisplay();
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
      // Show hint banner in round 1 only
      if (round === 1) $hintBanner.classList.remove('hidden');
      else $hintBanner.classList.add('hidden');
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
          showOverlay(`P${winner} WINS!`, 'Press SPACE to play again');
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
  // Handle onboarding progression and game start/restart
  if (gameState === 'IDLE') {
    if (e.key !== ' ') return;
    if (onboardingScreen === 1) {
      // Advance from Screen 1 to Screen 2
      onboardingScreen = 2;
      showOnboarding();
      return;
    } else {
      // Screen 2 → start game
      health = { 1: START_HEALTH, 2: START_HEALTH };
      round = 1;
      onboardingScreen = 1; // Reset for next game
      enterState('COUNTDOWN');
      return;
    }
  }

  if (gameState === 'GAME_OVER') {
    if (e.key !== ' ') return;
    health = { 1: START_HEALTH, 2: START_HEALTH };
    round = 1;
    onboardingScreen = 1; // Reset onboarding for next game
    enterState('COUNTDOWN');
    return;
  }

  if (gameState !== 'ROUND_ACTIVE') return;

  const mapping = ingredientForKey(e.key, currentKeyBindings);
  if (!mapping) return;

  const { player, ingredient } = mapping;
  const now = performance.now();

  // Cooldown check
  if (now < cooldownUntil[player]) return;
  const cooldownDuration = ingredient === 'scald' ? FIREBALL_COOLDOWN_MS : COOLDOWN_MS;
  cooldownUntil[player] = now + cooldownDuration;

  // Dim key rows during cooldown
  const controlsEl = $(`p${player}-controls`);
  controlsEl.classList.add('on-cooldown');
  setTimeout(() => controlsEl.classList.remove('on-cooldown'), cooldownDuration);

  // Flash the key + show floating label
  flashKeyRow(e.key);
  spawnFloatingLabel(ingredient, player);

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

  // Selectively randomize only the pressed key for that player
  // Find which ingredient index corresponds to this key for this player
  const playerKeys = player === 1 ? currentKeyBindings.p1 : currentKeyBindings.p2;
  const ingredientIndex = playerKeys.indexOf(e.key);
  if (ingredientIndex !== -1) {
    currentKeyBindings = randomizeOneKey(currentKeyBindings, player, ingredientIndex);

    // Update only the affected key row in the DOM
    const prefix = player === 1 ? 'p1' : 'p2';
    const controlsEl = $(`${prefix}-controls`);
    const rows = controlsEl.querySelectorAll('.key-row');
    if (ingredientIndex < rows.length) {
      const row = rows[ingredientIndex];
      const newKey = player === 1 ? currentKeyBindings.p1[ingredientIndex] : currentKeyBindings.p2[ingredientIndex];
      const keyEl = row.querySelector('.key');
      if (keyEl) keyEl.textContent = newKey;
      row.dataset.key = newKey;
    }
  }

  // Check explosion
  const explosion = checkExplosion(cauldron);
  if (explosion.exploded) {
    enterState('EXPLODING');
  }
});

// ── Init ──────────────────────────────────────────────────────
enterState('IDLE');

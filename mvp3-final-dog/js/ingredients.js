import {
  INGREDIENTS, PRESSURE_THRESHOLD, DIRECTION_MIN, DIRECTION_MAX,
  MAX_BREW_STACKS, REACTION_WINDOW_MS, lookupReaction,
} from './constants.js';

// ── Helpers ───────────────────────────────────────────────────

function clampDirection(d) {
  return Math.max(DIRECTION_MIN, Math.min(DIRECTION_MAX, d));
}

function clampPressure(p) {
  return Math.max(0, p);
}

/** Direction sign for a player: P1 pushes positive (toward P2), P2 pushes negative. */
function directionSign(player) {
  return player === 1 ? 1 : -1;
}

// ── State factory ─────────────────────────────────────────────

export function freshRoundState() {
  return {
    pressure: 0,
    direction: 0,
    brewStacks: { 1: 0, 2: 0 },
  };
}

// ── Apply a single ingredient press ───────────────────────────

export function applyIngredient(state, player, ingredientName) {
  const def = INGREDIENTS[ingredientName];
  if (!def) return state;

  let { pressure, direction, brewStacks } = state;
  const newBrewStacks = { ...brewStacks };

  // Brew multiplier from stored stacks (consumed on non-brew press)
  const multiplier = ingredientName !== 'brew' ? 1 + brewStacks[player] : 1;

  if (ingredientName === 'brew') {
    // Brew: increment stacks (cap at MAX_BREW_STACKS), add pressure
    newBrewStacks[player] = Math.min(MAX_BREW_STACKS, brewStacks[player] + 1);
    pressure += def.pressure;
  } else if (ingredientName === 'hex') {
    // Hex: reverse direction, add ±1 random variance, add pressure
    direction = -direction + (Math.random() < 0.5 ? 1 : -1);
    pressure += def.pressure;
    newBrewStacks[player] = 0;
  } else {
    // Fireball / Shield: apply pressure and direction with brew multiplier
    pressure += def.pressure;
    direction += def.direction * directionSign(player) * multiplier;
    newBrewStacks[player] = 0;
  }

  return {
    pressure: clampPressure(pressure),
    direction: clampDirection(direction),
    brewStacks: newBrewStacks,
  };
}

// ── Cross-player reaction detection ───────────────────────────

/**
 * Check whether two presses form a reaction.
 * @param {{ ingredient: string, time: number }} pressA
 * @param {{ ingredient: string, time: number }} pressB
 * @returns {string|null} reaction name or null
 */
export function checkReaction(pressA, pressB) {
  if (!pressA || !pressB) return null;
  if (Math.abs(pressA.time - pressB.time) > REACTION_WINDOW_MS) return null;
  return lookupReaction(pressA.ingredient, pressB.ingredient);
}

// ── Apply reaction effects ────────────────────────────────────

export function applyReaction(state, reactionName, triggerPlayer) {
  let { pressure, direction, brewStacks } = state;
  const newBrewStacks = { ...brewStacks };

  switch (reactionName) {
    case 'counter':
      // Shield after Fireball: negate Fireball's direction contribution.
      // Net effect: +2 pressure (3 fireball - 1 shield), 0 direction.
      // We undo the fireball's +3 direction from the last apply.
      direction -= 3 * directionSign(triggerPlayer === 1 ? 2 : 1);
      break;

    case 'clash':
      // Fireball+Fireball: directions cancel. Net: +6 pressure, 0 direction.
      direction = 0;
      break;

    case 'deflect':
      // Hex after Fireball: Fireball's direction reverses toward its caster.
      // The fireball was already applied; we reverse it twice (negate + reverse).
      {
        const fireballPlayer = triggerPlayer; // the one whose fireball gets deflected
        const fireballDir = 3 * directionSign(fireballPlayer);
        direction -= 2 * fireballDir; // undo original, apply reversed
      }
      break;

    case 'stall':
      // Shield+Shield: net -2 pressure, no direction change. Already applied.
      break;

    case 'chaos':
      // Hex+Hex: direction becomes random, +4 pressure already applied.
      direction = Math.floor(Math.random() * (DIRECTION_MAX - DIRECTION_MIN + 1)) + DIRECTION_MIN;
      break;

    case 'cancel':
      // Brew+Brew: both fizzle — reset brew stacks.
      newBrewStacks[1] = 0;
      newBrewStacks[2] = 0;
      break;
  }

  return {
    pressure: clampPressure(pressure),
    direction: clampDirection(direction),
    brewStacks: newBrewStacks,
  };
}

// ── Explosion check ───────────────────────────────────────────

export function checkExplosion(state) {
  if (state.pressure < PRESSURE_THRESHOLD) {
    return { exploded: false, loser: null };
  }
  // Direction determines who takes damage:
  // positive = aimed at P2, negative = aimed at P1, zero = random
  let loser;
  if (state.direction > 0) loser = 2;
  else if (state.direction < 0) loser = 1;
  else loser = Math.random() < 0.5 ? 1 : 2;

  return { exploded: true, loser };
}

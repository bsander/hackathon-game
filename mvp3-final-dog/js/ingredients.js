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

  // Boost multiplier from stored stacks (consumed on non-boost press)
  const multiplier = ingredientName !== 'boost' ? 1 + brewStacks[player] : 1;

  if (ingredientName === 'boost') {
    // Boost: increment stacks (cap at MAX_BREW_STACKS), add pressure
    newBrewStacks[player] = Math.min(MAX_BREW_STACKS, brewStacks[player] + 1);
    pressure += def.pressure;
  } else if (ingredientName === 'swirl') {
    // Swirl: reverse direction, add ±1 random variance, add pressure
    direction = -direction + (Math.random() < 0.5 ? 1 : -1);
    pressure += def.pressure;
    newBrewStacks[player] = 0;
  } else {
    // Scald / Cool: apply pressure and direction with boost multiplier
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
      // Cool after Scald: negate Scald's direction contribution.
      // Net effect: +2 pressure (3 scald - 1 cool), 0 direction.
      // We undo the scald's +3 direction from the last apply.
      direction -= 3 * directionSign(triggerPlayer === 1 ? 2 : 1);
      break;

    case 'clash':
      // Scald+Scald: directions cancel. Net: +6 pressure, 0 direction.
      direction = 0;
      break;

    case 'deflect':
      // Swirl after Scald: Scald's direction reverses toward its caster.
      // The scald was already applied; we reverse it twice (negate + reverse).
      {
        const scaldPlayer = triggerPlayer; // the one whose scald gets deflected
        const scaldDir = 3 * directionSign(scaldPlayer);
        direction -= 2 * scaldDir; // undo original, apply reversed
      }
      break;

    case 'stall':
      // Cool+Cool: net -2 pressure, no direction change. Already applied.
      break;

    case 'chaos':
      // Swirl+Swirl: direction becomes random, +4 pressure already applied.
      direction = Math.floor(Math.random() * (DIRECTION_MAX - DIRECTION_MIN + 1)) + DIRECTION_MIN;
      break;

    case 'cancel':
      // Boost+Boost: both fizzle — reset boost stacks.
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

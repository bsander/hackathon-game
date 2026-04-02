// ── Tuning ────────────────────────────────────────────────────
export const PRESSURE_THRESHOLD = 30;
export const DIRECTION_MIN = -10;
export const DIRECTION_MAX = 10;
export const COOLDOWN_MS = 500;
export const REACTION_WINDOW_MS = 800;
export const START_HEALTH = 3;
export const COUNTDOWN_SECS = 3;
export const PAUSE_BETWEEN_ROUNDS_MS = 2000;
export const MAX_BREW_STACKS = 2;

// ── Ingredients ───────────────────────────────────────────────
export const INGREDIENTS = {
  fireball: { pressure: 3, direction: 3, emoji: '🔥', label: 'Fireball' },
  shield:   { pressure: -1, direction: 0, emoji: '🛡', label: 'Shield' },
  hex:      { pressure: 2, direction: 'reverse', emoji: '💀', label: 'Hex' },
  brew:     { pressure: 1, direction: 0, emoji: '✨', label: 'Brew' },
};

export const INGREDIENT_ORDER = ['fireball', 'shield', 'hex', 'brew'];

// ── Key mappings ──────────────────────────────────────────────
export const P1_KEYS = ['1', '2', '3', '4'];
export const P2_KEYS = ['7', '8', '9', '0'];

export function ingredientForKey(key) {
  let idx = P1_KEYS.indexOf(key);
  if (idx !== -1) return { player: 1, ingredient: INGREDIENT_ORDER[idx] };
  idx = P2_KEYS.indexOf(key);
  if (idx !== -1) return { player: 2, ingredient: INGREDIENT_ORDER[idx] };
  return null;
}

// ── Cross-player reactions ────────────────────────────────────
// Keys are sorted alphabetically so lookup is order-independent.
export const REACTIONS = {
  'fireball+fireball': 'clash',
  'fireball+hex':      'deflect',
  'fireball+shield':   'counter',
  'brew+brew':         'cancel',
  'hex+hex':           'chaos',
  'shield+shield':     'stall',
};

export function lookupReaction(ingredientA, ingredientB) {
  const key = [ingredientA, ingredientB].sort().join('+');
  return REACTIONS[key] || null;
}

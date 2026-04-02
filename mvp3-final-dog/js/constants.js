// ── Tuning ────────────────────────────────────────────────────
export const PRESSURE_THRESHOLD = 30;
export const DIRECTION_MIN = -10;
export const DIRECTION_MAX = 10;
export const COOLDOWN_MS = 500;
export const FIREBALL_COOLDOWN_MS = 1200;
export const REACTION_WINDOW_MS = 800;
export const START_HEALTH = 3;
export const COUNTDOWN_SECS = 3;
export const PAUSE_BETWEEN_ROUNDS_MS = 2000;
export const MAX_BREW_STACKS = 2;

// ── Ingredients ───────────────────────────────────────────────
export const INGREDIENTS = {
  scald: { pressure: 3, direction: 3, emoji: '🔥', label: 'Scald' },
  cool:  { pressure: -1, direction: 0, emoji: '🧊', label: 'Cool' },
  swirl: { pressure: 2, direction: 'reverse', emoji: '🌀', label: 'Swirl' },
  boost: { pressure: 1, direction: 0, emoji: '✨', label: 'Boost' },
};

export const INGREDIENT_ORDER = ['scald', 'cool', 'swirl', 'boost'];

// ── Key mappings ──────────────────────────────────────────────
export const P1_KEYS = ['1', '2', '3', '4'];
export const P2_KEYS = ['7', '8', '9', '0'];

export const ALL_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g'];
export const KEYS_PER_PLAYER = 4;

// Fisher-Yates shuffle
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getRandomKeyBinding() {
  const shuffled = shuffleArray(ALL_KEYS);
  return {
    p1: shuffled.slice(0, KEYS_PER_PLAYER),
    p2: shuffled.slice(KEYS_PER_PLAYER, KEYS_PER_PLAYER * 2),
  };
}

export function ingredientForKey(key, keyBindings) {
  // Support both old API (no keyBindings) and new API (with keyBindings)
  const bindings = keyBindings || { p1: P1_KEYS, p2: P2_KEYS };

  let idx = bindings.p1.indexOf(key);
  if (idx !== -1) return { player: 1, ingredient: INGREDIENT_ORDER[idx] };
  idx = bindings.p2.indexOf(key);
  if (idx !== -1) return { player: 2, ingredient: INGREDIENT_ORDER[idx] };
  return null;
}

// ── Cross-player reactions ────────────────────────────────────
// Keys are sorted alphabetically so lookup is order-independent.
export const REACTIONS = {
  'boost+boost': 'cancel',
  'cool+cool':   'stall',
  'cool+scald':  'counter',
  'scald+scald': 'clash',
  'scald+swirl': 'deflect',
  'swirl+swirl': 'chaos',
};

export function lookupReaction(ingredientA, ingredientB) {
  const key = [ingredientA, ingredientB].sort().join('+');
  return REACTIONS[key] || null;
}

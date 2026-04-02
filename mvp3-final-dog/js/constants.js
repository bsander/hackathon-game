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

export const ALL_KEYS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
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

export function randomizeOneKey(keyBindings, player, ingredientIndex) {
  // Create a new binding object with copies of the current key arrays
  const updated = {
    p1: [...keyBindings.p1],
    p2: [...keyBindings.p2],
  };

  // Get the opponent's keys to avoid collisions
  const opponent = player === 1 ? 2 : 1;
  const opponentKeys = opponent === 1 ? updated.p1 : updated.p2;

  // Find an available key that doesn't collide with opponent
  let newKey;
  let attempts = 0;
  const maxAttempts = 100; // Defensive: prevent infinite loop
  do {
    newKey = ALL_KEYS[Math.floor(Math.random() * ALL_KEYS.length)];
    attempts++;
  } while (opponentKeys.includes(newKey) && attempts < maxAttempts);

  // Update the target player's key at the specified ingredient index
  const playerKeys = player === 1 ? updated.p1 : updated.p2;
  playerKeys[ingredientIndex] = newKey;

  return updated;
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

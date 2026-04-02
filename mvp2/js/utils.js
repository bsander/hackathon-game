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

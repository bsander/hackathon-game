import { describe, it, expect } from 'vitest';
import { randBetween, shuffleArray, otherPlayer, keysForPlayer, keyListForPlayer } from '../js/utils.js';
import { P1_KEYS, P2_KEYS } from '../js/constants.js';

describe('otherPlayer', () => {
  it('returns 2 for player 1', () => {
    expect(otherPlayer(1)).toBe(2);
  });

  it('returns 1 for player 2', () => {
    expect(otherPlayer(2)).toBe(1);
  });
});

describe('shuffleArray', () => {
  it('returns a new array', () => {
    const original = [1, 2, 3];
    const shuffled = shuffleArray(original);
    expect(shuffled).not.toBe(original);
  });

  it('preserves all elements', () => {
    const original = ['a', 'b', 'c', 'd'];
    const shuffled = shuffleArray(original);
    expect(shuffled.sort()).toEqual([...original].sort());
  });

  it('preserves length', () => {
    const original = [1, 2, 3];
    expect(shuffleArray(original)).toHaveLength(3);
  });

  it('does not mutate the input', () => {
    const original = [1, 2, 3];
    const copy = [...original];
    shuffleArray(original);
    expect(original).toEqual(copy);
  });
});

describe('randBetween', () => {
  it('returns values within [min, max)', () => {
    for (let i = 0; i < 100; i++) {
      const val = randBetween(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(10);
    }
  });

  it('returns min when range is zero', () => {
    expect(randBetween(7, 7)).toBe(7);
  });
});

describe('keysForPlayer', () => {
  it('returns P1_KEYS for player 1', () => {
    expect(keysForPlayer(1)).toBe(P1_KEYS);
  });

  it('returns P2_KEYS for player 2', () => {
    expect(keysForPlayer(2)).toBe(P2_KEYS);
  });
});

describe('keyListForPlayer', () => {
  it('returns correct keys for player 1', () => {
    expect(keyListForPlayer(1)).toEqual(['1', '2', '3']);
  });

  it('returns correct keys for player 2', () => {
    expect(keyListForPlayer(2)).toEqual(['8', '9', '0']);
  });
});

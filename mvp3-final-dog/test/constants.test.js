import { describe, it, expect } from 'vitest';
import {
  INGREDIENTS, INGREDIENT_ORDER, P1_KEYS, P2_KEYS, ALL_KEYS,
  ingredientForKey, lookupReaction, REACTIONS,
  PRESSURE_THRESHOLD, START_HEALTH,
  getRandomKeyBinding, randomizeOneKey,
} from '../js/constants.js';

describe('constants', () => {
  it('every ingredient in INGREDIENT_ORDER exists in INGREDIENTS', () => {
    for (const name of INGREDIENT_ORDER) {
      expect(INGREDIENTS[name]).toBeDefined();
    }
  });

  it('INGREDIENT_ORDER has exactly 4 entries', () => {
    expect(INGREDIENT_ORDER).toHaveLength(4);
  });

  it('key arrays match ingredient count', () => {
    expect(P1_KEYS).toHaveLength(INGREDIENT_ORDER.length);
    expect(P2_KEYS).toHaveLength(INGREDIENT_ORDER.length);
  });

  it('ingredientForKey maps P1 keys correctly', () => {
    expect(ingredientForKey('1')).toEqual({ player: 1, ingredient: 'scald' });
    expect(ingredientForKey('4')).toEqual({ player: 1, ingredient: 'boost' });
  });

  it('ingredientForKey maps P2 keys correctly', () => {
    expect(ingredientForKey('7')).toEqual({ player: 2, ingredient: 'scald' });
    expect(ingredientForKey('0')).toEqual({ player: 2, ingredient: 'boost' });
  });

  it('ingredientForKey returns null for unknown keys', () => {
    expect(ingredientForKey('a')).toBeNull();
    expect(ingredientForKey('5')).toBeNull();
  });

  it('PRESSURE_THRESHOLD and START_HEALTH are positive integers', () => {
    expect(PRESSURE_THRESHOLD).toBeGreaterThan(0);
    expect(Number.isInteger(PRESSURE_THRESHOLD)).toBe(true);
    expect(START_HEALTH).toBeGreaterThan(0);
    expect(Number.isInteger(START_HEALTH)).toBe(true);
  });
});

describe('reactions', () => {
  it('lookupReaction is order-independent', () => {
    expect(lookupReaction('scald', 'cool')).toBe('counter');
    expect(lookupReaction('cool', 'scald')).toBe('counter');
  });

  it('lookupReaction returns null for non-reacting pairs', () => {
    expect(lookupReaction('scald', 'boost')).toBeNull();
    expect(lookupReaction('cool', 'swirl')).toBeNull();
  });

  it('all 6 reactions are defined', () => {
    expect(Object.keys(REACTIONS)).toHaveLength(6);
  });
});

describe('expanded key pool', () => {
  it('ALL_KEYS contains exactly 36 alphanumeric keys', () => {
    expect(ALL_KEYS).toHaveLength(36);
  });

  it('ALL_KEYS contains all digits 0-9', () => {
    for (let i = 0; i <= 9; i++) {
      expect(ALL_KEYS).toContain(String(i));
    }
  });

  it('ALL_KEYS contains all letters a-z', () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    for (const letter of letters) {
      expect(ALL_KEYS).toContain(letter);
    }
  });

  it('ALL_KEYS contains no duplicate keys', () => {
    const uniqueKeys = new Set(ALL_KEYS);
    expect(uniqueKeys.size).toBe(36);
  });
});

describe('randomized key bindings', () => {
  it('getRandomKeyBinding returns correct structure with 4 keys per player', () => {
    const binding = getRandomKeyBinding();
    expect(binding).toHaveProperty('p1');
    expect(binding).toHaveProperty('p2');
    expect(binding.p1).toHaveLength(4);
    expect(binding.p2).toHaveLength(4);
  });

  it('getRandomKeyBinding returns no overlaps between P1 and P2', () => {
    const binding = getRandomKeyBinding();
    const p1Set = new Set(binding.p1);
    // Check no overlaps
    for (const key of binding.p2) {
      expect(p1Set.has(key)).toBe(false);
    }
  });

  it('getRandomKeyBinding samples from expanded 36-key pool', () => {
    // Collect many bindings to statistically verify they come from larger pool
    const seenKeys = new Set();
    for (let i = 0; i < 100; i++) {
      const binding = getRandomKeyBinding();
      binding.p1.forEach(k => seenKeys.add(k));
      binding.p2.forEach(k => seenKeys.add(k));
    }
    // With 36-key pool and 100 random 8-key draws, expect to see > 20 unique keys
    expect(seenKeys.size).toBeGreaterThan(20);
  });

  it('getRandomKeyBinding can be called repeatedly without error', () => {
    for (let i = 0; i < 10; i++) {
      const binding = getRandomKeyBinding();
      expect(binding.p1).toHaveLength(4);
      expect(binding.p2).toHaveLength(4);
    }
  });

  it('ingredientForKey accepts optional keyBindings parameter', () => {
    const binding = getRandomKeyBinding();
    // Should work with the new binding
    const result = ingredientForKey(binding.p1[0], binding);
    expect(result).toBeDefined();
    expect(result.player).toBe(1);
    expect(result.ingredient).toBeDefined();
  });
});

describe('selective key randomization', () => {
  it('randomizeOneKey returns valid key binding structure', () => {
    const binding = getRandomKeyBinding();
    const result = randomizeOneKey(binding, 1, 0);
    expect(result).toHaveProperty('p1');
    expect(result).toHaveProperty('p2');
    expect(result.p1).toHaveLength(4);
    expect(result.p2).toHaveLength(4);
  });

  it('randomizeOneKey only changes one key for the target player', () => {
    const binding = getRandomKeyBinding();
    const original = { ...binding };
    const result = randomizeOneKey(binding, 1, 0);

    // Count how many keys changed for P1
    let p1Changes = 0;
    for (let i = 0; i < 4; i++) {
      if (original.p1[i] !== result.p1[i]) p1Changes++;
    }
    expect(p1Changes).toBe(1);

    // P2 should not change at all
    for (let i = 0; i < 4; i++) {
      expect(result.p2[i]).toBe(binding.p2[i]);
    }
  });

  it('randomizeOneKey avoids collisions with opponent keys', () => {
    const binding = getRandomKeyBinding();
    for (let ingredientIdx = 0; ingredientIdx < 4; ingredientIdx++) {
      const result = randomizeOneKey(binding, 1, ingredientIdx);
      // The new P1 key at ingredientIdx should not collide with P2 keys
      const newKey = result.p1[ingredientIdx];
      expect(result.p2).not.toContain(newKey);
    }
  });

  it('randomizeOneKey changes different players independently', () => {
    const binding = getRandomKeyBinding();
    const p1Original = [...binding.p1];
    const p2Original = [...binding.p2];

    const result1 = randomizeOneKey(binding, 1, 0);
    // P1's first key changed, P2 unchanged
    expect(result1.p1[0]).not.toBe(p1Original[0]);
    for (let i = 0; i < 4; i++) {
      expect(result1.p2[i]).toBe(p2Original[i]);
    }

    // Now randomize P2's second key using the already-modified binding
    const result2 = randomizeOneKey(result1, 2, 1);
    // P2's second key changed
    expect(result2.p2[1]).not.toBe(result1.p2[1]);
    // P1 should stay the same as result1
    for (let i = 0; i < 4; i++) {
      expect(result2.p1[i]).toBe(result1.p1[i]);
    }
  });

  it('randomizeOneKey can be called multiple times on the same ingredient', () => {
    let binding = getRandomKeyBinding();
    const keys1 = randomizeOneKey(binding, 1, 0);
    const keys2 = randomizeOneKey(keys1, 1, 0);
    // Second randomization changed the key (almost certainly different)
    expect(keys2.p1[0]).not.toBe(keys1.p1[0]);
  });
});


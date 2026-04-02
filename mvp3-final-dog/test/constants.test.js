import { describe, it, expect } from 'vitest';
import {
  INGREDIENTS, INGREDIENT_ORDER, P1_KEYS, P2_KEYS,
  ingredientForKey, lookupReaction, REACTIONS,
  PRESSURE_THRESHOLD, START_HEALTH,
  getRandomKeyBinding,
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

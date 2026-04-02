import { describe, it, expect } from 'vitest';
import {
  INGREDIENTS, INGREDIENT_ORDER, P1_KEYS, P2_KEYS,
  ingredientForKey, lookupReaction, REACTIONS,
  PRESSURE_THRESHOLD, START_HEALTH, MAX_BREW_STACKS,
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
    expect(ingredientForKey('1')).toEqual({ player: 1, ingredient: 'fireball' });
    expect(ingredientForKey('4')).toEqual({ player: 1, ingredient: 'brew' });
  });

  it('ingredientForKey maps P2 keys correctly', () => {
    expect(ingredientForKey('7')).toEqual({ player: 2, ingredient: 'fireball' });
    expect(ingredientForKey('0')).toEqual({ player: 2, ingredient: 'brew' });
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
    expect(lookupReaction('fireball', 'shield')).toBe('counter');
    expect(lookupReaction('shield', 'fireball')).toBe('counter');
  });

  it('lookupReaction returns null for non-reacting pairs', () => {
    expect(lookupReaction('fireball', 'brew')).toBeNull();
    expect(lookupReaction('shield', 'hex')).toBeNull();
  });

  it('all 6 reactions are defined', () => {
    expect(Object.keys(REACTIONS)).toHaveLength(6);
  });
});

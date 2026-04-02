import { describe, it, expect } from 'vitest';
import { dealHand, spendCard, hasSpell, isEmpty, handCounts, availableSpells } from '../js/hand.js';

describe('dealHand', () => {
  it('returns exactly 5 cards', () => {
    expect(dealHand()).toHaveLength(5);
  });

  it('only contains valid spell names', () => {
    const valid = new Set(['Fireball', 'Shield', 'Hex']);
    for (const card of dealHand()) {
      expect(valid.has(card)).toBe(true);
    }
  });

  it('each deal is independent — different players can have different hands', () => {
    // Run 20 deals; at least one pair should differ (probability of all same ≈ 0)
    const hands = Array.from({ length: 20 }, () => dealHand().sort().join(','));
    expect(new Set(hands).size).toBeGreaterThan(1);
  });
});

describe('spendCard', () => {
  it('removes one instance of the spell', () => {
    const hand = ['Fireball', 'Fireball', 'Shield', 'Hex', 'Shield'];
    const result = spendCard(hand, 'Fireball');
    expect(result).toHaveLength(4);
    expect(result.filter(c => c === 'Fireball')).toHaveLength(1);
  });

  it('does not mutate the original hand', () => {
    const hand = ['Fireball', 'Shield', 'Hex', 'Fireball', 'Shield'];
    spendCard(hand, 'Shield');
    expect(hand).toHaveLength(5);
  });

  it('removes exactly one card even when multiple copies exist', () => {
    const hand = ['Hex', 'Hex', 'Hex', 'Shield', 'Fireball'];
    const result = spendCard(hand, 'Hex');
    expect(result.filter(c => c === 'Hex')).toHaveLength(2);
  });

  it('returns the same hand when spell is not present', () => {
    const hand = ['Fireball', 'Shield', 'Shield'];
    const result = spendCard(hand, 'Hex');
    expect(result).toEqual(['Fireball', 'Shield', 'Shield']);
    expect(result).toBe(hand); // same reference returned
  });
});

describe('hasSpell', () => {
  it('returns true when spell is in hand', () => {
    expect(hasSpell(['Fireball', 'Shield', 'Hex', 'Fireball', 'Shield'], 'Hex')).toBe(true);
  });

  it('returns false when spell is not in hand', () => {
    expect(hasSpell(['Fireball', 'Fireball', 'Fireball', 'Shield', 'Shield'], 'Hex')).toBe(false);
  });
});

describe('isEmpty', () => {
  it('returns true for empty array', () => {
    expect(isEmpty([])).toBe(true);
  });

  it('returns false for non-empty hand', () => {
    expect(isEmpty(['Fireball'])).toBe(false);
  });
});

describe('handCounts', () => {
  it('returns correct counts for each spell type', () => {
    const hand = ['Fireball', 'Fireball', 'Shield', 'Hex', 'Fireball'];
    expect(handCounts(hand)).toEqual({ Fireball: 3, Shield: 1, Hex: 1 });
  });

  it('returns zero for missing spell types', () => {
    const hand = ['Shield', 'Shield', 'Shield', 'Shield', 'Shield'];
    expect(handCounts(hand)).toEqual({ Fireball: 0, Shield: 5, Hex: 0 });
  });
});

describe('availableSpells', () => {
  it('returns only spell types with count > 0', () => {
    const hand = ['Fireball', 'Fireball', 'Shield', 'Shield', 'Shield'];
    expect(availableSpells(hand).sort()).toEqual(['Fireball', 'Shield']);
  });

  it('returns all three types when all present', () => {
    const hand = ['Fireball', 'Shield', 'Hex', 'Fireball', 'Shield'];
    expect(availableSpells(hand).sort()).toEqual(['Fireball', 'Hex', 'Shield']);
  });

  it('returns empty array for empty hand', () => {
    expect(availableSpells([])).toEqual([]);
  });
});

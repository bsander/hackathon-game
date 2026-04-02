import { describe, it, expect } from 'vitest';
import {
  freshRoundState, applyIngredient, checkReaction,
  applyReaction, checkExplosion,
} from '../js/ingredients.js';
import { PRESSURE_THRESHOLD } from '../js/constants.js';

// ── freshRoundState ───────────────────────────────────────────

describe('freshRoundState', () => {
  it('starts at zero pressure and direction', () => {
    const s = freshRoundState();
    expect(s.pressure).toBe(0);
    expect(s.direction).toBe(0);
  });

  it('starts with zero brew stacks for both players', () => {
    const s = freshRoundState();
    expect(s.brewStacks[1]).toBe(0);
    expect(s.brewStacks[2]).toBe(0);
  });
});

// ── applyIngredient ───────────────────────────────────────────

describe('applyIngredient', () => {
  it('fireball: P1 adds +3 pressure and +3 direction (toward P2)', () => {
    const s = applyIngredient(freshRoundState(), 1, 'fireball');
    expect(s.pressure).toBe(3);
    expect(s.direction).toBe(3);
  });

  it('fireball: P2 adds +3 pressure and -3 direction (toward P1)', () => {
    const s = applyIngredient(freshRoundState(), 2, 'fireball');
    expect(s.pressure).toBe(3);
    expect(s.direction).toBe(-3);
  });

  it('shield: removes 1 pressure, no direction change', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'fireball'); // pressure=3
    s = applyIngredient(s, 1, 'shield');
    expect(s.pressure).toBe(2);
    expect(s.direction).toBe(3); // unchanged from fireball
  });

  it('shield: pressure does not go below zero', () => {
    const s = applyIngredient(freshRoundState(), 1, 'shield');
    expect(s.pressure).toBe(0);
  });

  it('hex: reverses direction and adds ±1 variance', () => {
    let s = freshRoundState();
    s.direction = 5;
    s = { ...s }; // clone
    const result = applyIngredient(s, 1, 'hex');
    expect(result.pressure).toBe(2);
    // direction should be -5 ± 1
    expect(result.direction).toBeGreaterThanOrEqual(-6);
    expect(result.direction).toBeLessThanOrEqual(-4);
  });

  it('brew: adds 1 pressure and increments brew stacks', () => {
    const s = applyIngredient(freshRoundState(), 1, 'brew');
    expect(s.pressure).toBe(1);
    expect(s.brewStacks[1]).toBe(1);
    expect(s.direction).toBe(0);
  });

  it('brew: caps at 2 stacks', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'brew');
    s = applyIngredient(s, 1, 'brew');
    s = applyIngredient(s, 1, 'brew');
    expect(s.brewStacks[1]).toBe(2);
  });

  it('brew multiplier: 1 brew stack → 2× direction on fireball', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'brew');    // 1 stack
    s = applyIngredient(s, 1, 'fireball'); // 2× direction
    expect(s.direction).toBe(6); // 3 * 2
    expect(s.brewStacks[1]).toBe(0); // consumed
  });

  it('brew multiplier: 2 brew stacks → 3× direction on fireball', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'brew');
    s = applyIngredient(s, 1, 'brew');     // 2 stacks
    s = applyIngredient(s, 1, 'fireball'); // 3× direction
    expect(s.direction).toBe(9); // 3 * 3
    expect(s.brewStacks[1]).toBe(0);
  });

  it('brew stacks are per-player', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'brew');
    s = applyIngredient(s, 2, 'fireball');
    expect(s.brewStacks[1]).toBe(1); // P1 stack intact
    expect(s.brewStacks[2]).toBe(0);
  });

  it('non-brew press resets brew stacks', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'brew');
    s = applyIngredient(s, 1, 'shield');
    expect(s.brewStacks[1]).toBe(0);
  });

  it('direction is clamped to [-10, 10]', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'brew');
    s = applyIngredient(s, 1, 'brew');
    s = applyIngredient(s, 1, 'fireball'); // +9, direction=9
    s = applyIngredient(s, 1, 'fireball'); // +3, would be 12 → clamped to 10
    expect(s.direction).toBe(10);
  });

  it('returns state unchanged for unknown ingredient', () => {
    const s = freshRoundState();
    const result = applyIngredient(s, 1, 'banana');
    expect(result).toEqual(s);
  });
});

// ── checkReaction ─────────────────────────────────────────────

describe('checkReaction', () => {
  it('returns reaction name when within window', () => {
    const a = { ingredient: 'fireball', time: 1000 };
    const b = { ingredient: 'shield', time: 1500 };
    expect(checkReaction(a, b)).toBe('counter');
  });

  it('returns null when outside window', () => {
    const a = { ingredient: 'fireball', time: 1000 };
    const b = { ingredient: 'shield', time: 2000 };
    expect(checkReaction(a, b)).toBeNull();
  });

  it('returns null when presses are null', () => {
    expect(checkReaction(null, { ingredient: 'fireball', time: 0 })).toBeNull();
    expect(checkReaction({ ingredient: 'fireball', time: 0 }, null)).toBeNull();
  });

  it('returns null for non-reacting pair', () => {
    const a = { ingredient: 'fireball', time: 1000 };
    const b = { ingredient: 'brew', time: 1200 };
    expect(checkReaction(a, b)).toBeNull();
  });

  it('exactly at 800ms boundary returns a reaction', () => {
    const a = { ingredient: 'hex', time: 1000 };
    const b = { ingredient: 'hex', time: 1800 };
    expect(checkReaction(a, b)).toBe('chaos');
  });

  it('1ms over boundary returns null', () => {
    const a = { ingredient: 'hex', time: 1000 };
    const b = { ingredient: 'hex', time: 1801 };
    expect(checkReaction(a, b)).toBeNull();
  });
});

// ── applyReaction ─────────────────────────────────────────────

describe('applyReaction', () => {
  it('counter: negates fireball direction', () => {
    // Scenario: P2 fires fireball (dir -= 3), then P1 shields → counter
    let s = freshRoundState();
    s = applyIngredient(s, 2, 'fireball'); // direction = -3
    s = applyIngredient(s, 1, 'shield');   // pressure = 2
    s = applyReaction(s, 'counter', 1); // P1 triggered the counter (shielded)
    expect(s.direction).toBe(0);
    expect(s.pressure).toBe(2); // 3 - 1
  });

  it('clash: directions cancel to zero', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'fireball'); // dir = +3
    s = applyIngredient(s, 2, 'fireball'); // dir = 0 (3 - 3)
    s = applyReaction(s, 'clash', 1);
    expect(s.direction).toBe(0);
    expect(s.pressure).toBe(6);
  });

  it('cancel: resets both brew stacks', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'brew'); // stacks: P1=1
    s = applyIngredient(s, 2, 'brew'); // stacks: P2=1
    s = applyReaction(s, 'cancel', 1);
    expect(s.brewStacks[1]).toBe(0);
    expect(s.brewStacks[2]).toBe(0);
  });

  it('stall: no additional changes', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'shield');
    s = applyIngredient(s, 2, 'shield');
    const before = { ...s };
    s = applyReaction(s, 'stall', 1);
    expect(s.pressure).toBe(before.pressure);
    expect(s.direction).toBe(before.direction);
  });

  it('chaos: direction becomes random within range', () => {
    const seen = new Set();
    for (let i = 0; i < 100; i++) {
      let s = freshRoundState();
      s.pressure = 4;
      s = applyReaction(s, 'chaos', 1);
      expect(s.direction).toBeGreaterThanOrEqual(-10);
      expect(s.direction).toBeLessThanOrEqual(10);
      seen.add(s.direction);
    }
    // Should produce multiple distinct values
    expect(seen.size).toBeGreaterThan(3);
  });
});

// ── checkExplosion ────────────────────────────────────────────

describe('checkExplosion', () => {
  it('does not explode below threshold', () => {
    const s = { pressure: PRESSURE_THRESHOLD - 1, direction: 5, brewStacks: { 1: 0, 2: 0 } };
    expect(checkExplosion(s).exploded).toBe(false);
  });

  it('explodes at threshold', () => {
    const s = { pressure: PRESSURE_THRESHOLD, direction: 5, brewStacks: { 1: 0, 2: 0 } };
    expect(checkExplosion(s).exploded).toBe(true);
  });

  it('positive direction → P2 loses', () => {
    const s = { pressure: PRESSURE_THRESHOLD, direction: 3, brewStacks: { 1: 0, 2: 0 } };
    expect(checkExplosion(s).loser).toBe(2);
  });

  it('negative direction → P1 loses', () => {
    const s = { pressure: PRESSURE_THRESHOLD, direction: -3, brewStacks: { 1: 0, 2: 0 } };
    expect(checkExplosion(s).loser).toBe(1);
  });

  it('zero direction → random loser', () => {
    const losers = new Set();
    for (let i = 0; i < 50; i++) {
      const s = { pressure: PRESSURE_THRESHOLD, direction: 0, brewStacks: { 1: 0, 2: 0 } };
      losers.add(checkExplosion(s).loser);
    }
    expect(losers.has(1)).toBe(true);
    expect(losers.has(2)).toBe(true);
  });
});

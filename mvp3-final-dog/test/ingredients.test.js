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
  it('scald: P1 adds +3 pressure and +3 direction (toward P2)', () => {
    const s = applyIngredient(freshRoundState(), 1, 'scald');
    expect(s.pressure).toBe(3);
    expect(s.direction).toBe(3);
  });

  it('scald: P2 adds +3 pressure and -3 direction (toward P1)', () => {
    const s = applyIngredient(freshRoundState(), 2, 'scald');
    expect(s.pressure).toBe(3);
    expect(s.direction).toBe(-3);
  });

  it('cool: removes 1 pressure, no direction change', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'scald'); // pressure=3
    s = applyIngredient(s, 1, 'cool');
    expect(s.pressure).toBe(2);
    expect(s.direction).toBe(3); // unchanged from scald
  });

  it('cool: pressure does not go below zero', () => {
    const s = applyIngredient(freshRoundState(), 1, 'cool');
    expect(s.pressure).toBe(0);
  });

  it('swirl: reverses direction and adds ±1 variance', () => {
    let s = freshRoundState();
    s.direction = 5;
    s = { ...s }; // clone
    const result = applyIngredient(s, 1, 'swirl');
    expect(result.pressure).toBe(2);
    // direction should be -5 ± 1
    expect(result.direction).toBeGreaterThanOrEqual(-6);
    expect(result.direction).toBeLessThanOrEqual(-4);
  });

  it('boost: adds 1 pressure and increments brew stacks', () => {
    const s = applyIngredient(freshRoundState(), 1, 'boost');
    expect(s.pressure).toBe(1);
    expect(s.brewStacks[1]).toBe(1);
    expect(s.direction).toBe(0);
  });

  it('boost: caps at 2 stacks', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'boost');
    s = applyIngredient(s, 1, 'boost');
    s = applyIngredient(s, 1, 'boost');
    expect(s.brewStacks[1]).toBe(2);
  });

  it('boost multiplier: 1 boost stack → 2× direction on scald', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'boost');    // 1 stack
    s = applyIngredient(s, 1, 'scald'); // 2× direction
    expect(s.direction).toBe(6); // 3 * 2
    expect(s.brewStacks[1]).toBe(0); // consumed
  });

  it('boost multiplier: 2 boost stacks → 3× direction on scald', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'boost');
    s = applyIngredient(s, 1, 'boost');     // 2 stacks
    s = applyIngredient(s, 1, 'scald'); // 3× direction
    expect(s.direction).toBe(9); // 3 * 3
    expect(s.brewStacks[1]).toBe(0);
  });

  it('boost stacks are per-player', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'boost');
    s = applyIngredient(s, 2, 'scald');
    expect(s.brewStacks[1]).toBe(1); // P1 stack intact
    expect(s.brewStacks[2]).toBe(0);
  });

  it('non-boost press resets brew stacks', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'boost');
    s = applyIngredient(s, 1, 'cool');
    expect(s.brewStacks[1]).toBe(0);
  });

  it('direction is clamped to [-10, 10]', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'boost');
    s = applyIngredient(s, 1, 'boost');
    s = applyIngredient(s, 1, 'scald'); // +9, direction=9
    s = applyIngredient(s, 1, 'scald'); // +3, would be 12 → clamped to 10
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
    const a = { ingredient: 'scald', time: 1000 };
    const b = { ingredient: 'cool', time: 1500 };
    expect(checkReaction(a, b)).toBe('counter');
  });

  it('returns null when outside window', () => {
    const a = { ingredient: 'scald', time: 1000 };
    const b = { ingredient: 'cool', time: 2000 };
    expect(checkReaction(a, b)).toBeNull();
  });

  it('returns null when presses are null', () => {
    expect(checkReaction(null, { ingredient: 'scald', time: 0 })).toBeNull();
    expect(checkReaction({ ingredient: 'scald', time: 0 }, null)).toBeNull();
  });

  it('returns null for non-reacting pair', () => {
    const a = { ingredient: 'scald', time: 1000 };
    const b = { ingredient: 'boost', time: 1200 };
    expect(checkReaction(a, b)).toBeNull();
  });

  it('exactly at 800ms boundary returns a reaction', () => {
    const a = { ingredient: 'swirl', time: 1000 };
    const b = { ingredient: 'swirl', time: 1800 };
    expect(checkReaction(a, b)).toBe('chaos');
  });

  it('1ms over boundary returns null', () => {
    const a = { ingredient: 'swirl', time: 1000 };
    const b = { ingredient: 'swirl', time: 1801 };
    expect(checkReaction(a, b)).toBeNull();
  });
});

// ── applyReaction ─────────────────────────────────────────────

describe('applyReaction', () => {
  it('counter: negates scald direction', () => {
    // Scenario: P2 fires scald (dir -= 3), then P1 cools → counter
    let s = freshRoundState();
    s = applyIngredient(s, 2, 'scald'); // direction = -3
    s = applyIngredient(s, 1, 'cool');   // pressure = 2
    s = applyReaction(s, 'counter', 1); // P1 triggered the counter (cooled)
    expect(s.direction).toBe(0);
    expect(s.pressure).toBe(2); // 3 - 1
  });

  it('clash: directions cancel to zero', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'scald'); // dir = +3
    s = applyIngredient(s, 2, 'scald'); // dir = 0 (3 - 3)
    s = applyReaction(s, 'clash', 1);
    expect(s.direction).toBe(0);
    expect(s.pressure).toBe(6);
  });

  it('cancel: resets both boost stacks', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'boost'); // stacks: P1=1
    s = applyIngredient(s, 2, 'boost'); // stacks: P2=1
    s = applyReaction(s, 'cancel', 1);
    expect(s.brewStacks[1]).toBe(0);
    expect(s.brewStacks[2]).toBe(0);
  });

  it('stall: no additional changes', () => {
    let s = freshRoundState();
    s = applyIngredient(s, 1, 'cool');
    s = applyIngredient(s, 2, 'cool');
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

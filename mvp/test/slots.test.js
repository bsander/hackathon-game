import { describe, it, expect } from 'vitest';
import { SLOT_DEFAULTS, CHAOS } from '../js/constants.js';

describe('SLOT_DEFAULTS', () => {
  it('has exactly three spells', () => {
    expect(SLOT_DEFAULTS).toHaveLength(3);
  });

  it('matches the standard spell order: Fireball, Shield, Hex', () => {
    expect(SLOT_DEFAULTS).toEqual(['Fireball', 'Shield', 'Hex']);
  });

  it('is not mutated when copied', () => {
    const copy = [...SLOT_DEFAULTS];
    copy[0] = 'Chaos';
    expect(SLOT_DEFAULTS[0]).toBe('Fireball');
  });
});

describe('CHAOS constant', () => {
  it('is the string Chaos', () => {
    expect(CHAOS).toBe('Chaos');
  });

  it('is not one of the standard spells', () => {
    expect(SLOT_DEFAULTS).not.toContain(CHAOS);
  });
});

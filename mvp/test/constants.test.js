import { describe, it, expect } from 'vitest';
import { SPELLS, BEATS, P1_KEYS, P2_KEYS, WIN_SCORE } from '../js/constants.js';

describe('SPELLS', () => {
  it('has exactly three spells', () => {
    expect(SPELLS).toHaveLength(3);
  });
});

describe('BEATS', () => {
  it('every spell beats exactly one other spell', () => {
    for (const spell of SPELLS) {
      expect(BEATS[spell]).toBeDefined();
      expect(SPELLS).toContain(BEATS[spell]);
    }
  });

  it('no spell beats itself', () => {
    for (const spell of SPELLS) {
      expect(BEATS[spell]).not.toBe(spell);
    }
  });

  it('the cycle is complete — no two spells beat the same target', () => {
    const targets = SPELLS.map(s => BEATS[s]);
    expect(new Set(targets).size).toBe(SPELLS.length);
  });
});

describe('key mappings', () => {
  it('P1 keys map to all three spells', () => {
    const spells = Object.values(P1_KEYS);
    expect(spells.sort()).toEqual([...SPELLS].sort());
  });

  it('P2 keys map to all three spells', () => {
    const spells = Object.values(P2_KEYS);
    expect(spells.sort()).toEqual([...SPELLS].sort());
  });

  it('P1 and P2 use different keys', () => {
    const p1Keys = Object.keys(P1_KEYS);
    const p2Keys = Object.keys(P2_KEYS);
    for (const k of p1Keys) {
      expect(p2Keys).not.toContain(k);
    }
  });
});

describe('WIN_SCORE', () => {
  it('is a positive integer', () => {
    expect(WIN_SCORE).toBeGreaterThan(0);
    expect(Number.isInteger(WIN_SCORE)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { resolveSpells, nextStateAfterResolve } from '../js/resolution.js';
import { SPELLS, BEATS, WIN_SCORE } from '../js/constants.js';

describe('resolveSpells', () => {
  describe('timeout (null defendSpell)', () => {
    it('returns HIT when defender did not cast', () => {
      const result = resolveSpells('Fireball', null);
      expect(result.outcome).toBe('HIT');
      expect(result.defendSpell).toBeNull();
    });

    it('returns HIT when defendSpell is undefined', () => {
      const result = resolveSpells('Shield', undefined);
      expect(result.outcome).toBe('HIT');
    });
  });

  describe('same spell — CLASH', () => {
    for (const spell of SPELLS) {
      it(`${spell} vs ${spell} = CLASH`, () => {
        const result = resolveSpells(spell, spell);
        expect(result.outcome).toBe('CLASH');
      });
    }
  });

  describe('defender counters — BLOCKED', () => {
    // BEATS maps defend → what it counters. If BEATS[defend] === attack, it's blocked.
    for (const defend of SPELLS) {
      const attack = BEATS[defend];
      it(`${defend} blocks ${attack}`, () => {
        const result = resolveSpells(attack, defend);
        expect(result.outcome).toBe('BLOCKED');
      });
    }
  });

  describe('attack breaks through — HIT', () => {
    // Attack hits when defend does NOT counter it and spells differ
    for (const attack of SPELLS) {
      for (const defend of SPELLS) {
        if (attack === defend) continue;
        if (BEATS[defend] === attack) continue;
        it(`${attack} hits through ${defend}`, () => {
          const result = resolveSpells(attack, defend);
          expect(result.outcome).toBe('HIT');
        });
      }
    }
  });

  it('covers exactly 9 spell combinations (3 CLASH + 3 BLOCKED + 3 HIT)', () => {
    let clash = 0, blocked = 0, hit = 0;
    for (const atk of SPELLS) {
      for (const def of SPELLS) {
        const { outcome } = resolveSpells(atk, def);
        if (outcome === 'CLASH') clash++;
        else if (outcome === 'BLOCKED') blocked++;
        else if (outcome === 'HIT') hit++;
      }
    }
    expect(clash).toBe(3);
    expect(blocked).toBe(3);
    expect(hit).toBe(3);
  });

  it('always returns both spells in the result', () => {
    const result = resolveSpells('Fireball', 'Shield');
    expect(result.attackSpell).toBe('Fireball');
    expect(result.defendSpell).toBe('Shield');
  });
});

describe('nextStateAfterResolve', () => {
  it('HIT at score 0 → NEXT_ROUND with scoreChange 1', () => {
    const result = nextStateAfterResolve('HIT', 0, WIN_SCORE);
    expect(result).toEqual({ scoreChange: 1, next: 'NEXT_ROUND' });
  });

  it('HIT at score WIN_SCORE-1 → GAME_OVER', () => {
    const result = nextStateAfterResolve('HIT', WIN_SCORE - 1, WIN_SCORE);
    expect(result).toEqual({ scoreChange: 1, next: 'GAME_OVER' });
  });

  it('HIT at score 1 (win=3) → NEXT_ROUND', () => {
    const result = nextStateAfterResolve('HIT', 1, 3);
    expect(result).toEqual({ scoreChange: 1, next: 'NEXT_ROUND' });
  });

  it('CLASH → SWAP with no score change', () => {
    const result = nextStateAfterResolve('CLASH', 2, WIN_SCORE);
    expect(result).toEqual({ scoreChange: 0, next: 'SWAP' });
  });

  it('BLOCKED → SWAP with no score change', () => {
    const result = nextStateAfterResolve('BLOCKED', 1, WIN_SCORE);
    expect(result).toEqual({ scoreChange: 0, next: 'SWAP' });
  });

  it('HIT beyond win score still returns GAME_OVER', () => {
    const result = nextStateAfterResolve('HIT', WIN_SCORE, WIN_SCORE);
    expect(result).toEqual({ scoreChange: 1, next: 'GAME_OVER' });
  });
});
